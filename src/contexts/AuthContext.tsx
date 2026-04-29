import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile, UserRole, SearchPreset } from "../types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSecretary: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  savePreset: (preset: SearchPreset) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... same as before but ensure profile handling is consistent
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const isDefaultAdmin = firebaseUser.email === "teongu2210@gmail.com";
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: isDefaultAdmin ? "admin" : "secretary",
              presets: []
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            role: "admin",
            presets: []
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const savePreset = async (preset: SearchPreset) => {
    if (!user || !profile) return;
    const updatedPresets = [...(profile.presets || []), preset];
    const updatedProfile = { ...profile, presets: updatedPresets };
    await setDoc(doc(db, "users", user.uid), updatedProfile);
    setProfile(updatedProfile);
  };

  const deletePreset = async (presetId: string) => {
    if (!user || !profile) return;
    const updatedPresets = (profile.presets || []).filter(p => p.id !== presetId);
    const updatedProfile = { ...profile, presets: updatedPresets };
    await setDoc(doc(db, "users", user.uid), updatedProfile);
    setProfile(updatedProfile);
  };

  const isAdmin = profile?.role === "admin";
  const isSecretary = profile?.role === "secretary";

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSecretary, login, logout, savePreset, deletePreset }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
