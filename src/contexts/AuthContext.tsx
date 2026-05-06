import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile, SearchPreset } from "../types";

interface AuthContextType {
  user: { uid: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSecretary: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; role: 'admin' | 'secretary'; unitId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { fullName: string; avatarUrl: string; email: string; phone: string }) => Promise<void>;
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
      if (!response.ok) {
        // If profile not found, don't necessarily overwrite with a fallback
        // unless it's a completely new session.
        return;
      }
      const data = await response.json();
      if (data && data.uid) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Login failed");
      }

      const data = await response.json();
      const userData = { uid: data.uid, email: data.email };
      setUser(userData);
      setProfile(data);
      localStorage.setItem("local_user", JSON.stringify(userData));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (regData: { email: string; password: string; role: 'admin' | 'secretary'; unitId?: string }) => {
    setLoading(true);
    try {
      const uid = Math.random().toString(36).substring(2, 11);
      const data = {
        uid,
        email: regData.email,
        password: regData.password,
        role: regData.role,
        unitId: regData.unitId,
        presets: []
      };

      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const userData = { uid: data.uid, email: data.email };
      setUser(userData);
      // Clean up password before setting profile
      const { password: _, ...profileWithoutPassword } = data;
      setProfile(profileWithoutPassword as UserProfile);
      localStorage.setItem("local_user", JSON.stringify(userData));
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem("local_user");
  };

  const updateProfile = async (data: { fullName: string; avatarUrl: string; email: string; phone: string }) => {
    if (!profile) return;
    await fetch(`/api/users/${profile.uid}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    setProfile(prev => prev ? { ...prev, ...data } : null);
    if (user) {
      const updatedUser = { ...user, email: data.email };
      setUser(updatedUser);
      localStorage.setItem("local_user", JSON.stringify(updatedUser));
    }
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
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSecretary, login, register, logout, updateProfile, savePreset, deletePreset }}>
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
