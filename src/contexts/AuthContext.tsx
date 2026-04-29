import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile, SearchPreset } from "../types";

interface AuthContextType {
  user: { uid: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSecretary: boolean;
  login: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
  savePreset: (preset: SearchPreset) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("local_user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchProfile(userData.uid);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const response = await fetch(`/api/users/${uid}`);
      const data = await response.json();
      if (data) {
        setProfile(data);
      } else {
        // Fallback for new users if not seeded
        const newProfile: UserProfile = {
          uid,
          email: user?.email || "user@local.test",
          role: "secretary",
          presets: []
        };
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email = "admin@local.test") => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/by-email/${email}`);
      let data = await response.json();
      
      if (!data) {
        // Create user if not exists
        const uid = Math.random().toString(36).substring(2, 11);
        data = {
          uid,
          email,
          role: "secretary",
          presets: []
        };
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }

      const userData = { uid: data.uid, email: data.email };
      setUser(userData);
      setProfile(data);
      localStorage.setItem("local_user", JSON.stringify(userData));
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("local_user");
  };

  const savePreset = async (preset: SearchPreset) => {
    if (!profile) return;
    const updatedPresets = [...(profile.presets || []), preset];
    const updatedProfile = { ...profile, presets: updatedPresets };
    
    await fetch(`/api/users/${profile.uid}/presets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presets: updatedPresets })
    });
    
    setProfile(updatedProfile);
  };

  const deletePreset = async (presetId: string) => {
    if (!profile) return;
    const updatedPresets = (profile.presets || []).filter(p => p.id !== presetId);
    const updatedProfile = { ...profile, presets: updatedPresets };

    await fetch(`/api/users/${profile.uid}/presets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presets: updatedPresets })
    });

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
