/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Usernames {
  linkedin: string;
  github: string;
  leetcode: string;
  codechef: string;
  codeforces: string;
  [key: string]: string;
}

export type AccentColorType = "zinc" | "violet" | "emerald" | "blue" | "rose" | "amber";
export type ThemeModeType = "dark" | "light";

export interface UserAccountData {
  password?: string;
  usernames?: Usernames;
  masterAvatar?: string | null;
  accentColor?: AccentColorType;
  themeMode?: ThemeModeType;
}

interface UserContextType {
  isAuthenticated: boolean;
  email: string | null;
  usernames: Usernames;
  masterAvatar: string | null;
  accentColor: AccentColorType;
  themeMode: ThemeModeType;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUsernames: (newUsernames: Partial<Usernames>) => void;
  updateMasterAvatar: (base64: string | null) => void;
  setAccentColor: (color: AccentColorType) => void;
  setThemeMode: (theme: ThemeModeType) => void;
}

const defaultUsernames: Usernames = {
  linkedin: "",
  github: "",
  leetcode: "",
  codechef: "",
  codeforces: "",
};

const ACCENT_COLORS = {
  zinc: { hex: "#71717a", glow: "rgba(113, 113, 122, 0.15)" },
  violet: { hex: "#8b5cf6", glow: "rgba(139, 92, 246, 0.15)" },
  emerald: { hex: "#10b981", glow: "rgba(16, 185, 129, 0.15)" },
  blue: { hex: "#3b82f6", glow: "rgba(59, 130, 246, 0.15)" },
  rose: { hex: "#f43f5e", glow: "rgba(244, 63, 94, 0.15)" },
  amber: { hex: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" },
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Usernames>(defaultUsernames);
  const [masterAvatar, setMasterAvatar] = useState<string | null>(null);
  const [accentColor, setAccentColorState] = useState<AccentColorType>("blue");
  const [themeMode, setThemeModeState] = useState<ThemeModeType>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial load of active session from localStorage
    const activeEmail = localStorage.getItem("profilesync_active_email");
    if (activeEmail) {
      const accountsJson = localStorage.getItem("profilesync_accounts");
      if (accountsJson) {
        try {
          const accounts = JSON.parse(accountsJson);
          const userData = accounts[activeEmail];
          if (userData) {
            setIsAuthenticated(true);
            setEmail(activeEmail);
            setUsernames({ ...defaultUsernames, ...userData.usernames });
            setMasterAvatar(userData.masterAvatar || null);
            setAccentColorState(userData.accentColor || "blue");
            setThemeModeState(userData.themeMode || "dark");
          }
        } catch (e) {
          console.error("Failed to parse accounts on load:", e);
        }
      }
    }
    setIsLoaded(true);
  }, []);

  // Sync theme changes to DOM
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode, isLoaded]);

  // Sync accent color changes to DOM CSS Variables
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
    root.style.setProperty("--accent-color", colors.hex);
    root.style.setProperty("--accent-glow", colors.glow);
  }, [accentColor, isLoaded]);

  // Save current user data helper
  const saveUserData = (
    currentEmail: string,
    updates: {
      usernames?: Usernames;
      masterAvatar?: string | null;
      accentColor?: AccentColorType;
      themeMode?: ThemeModeType;
    }
  ) => {
    const accountsJson = localStorage.getItem("profilesync_accounts");
    let accounts: Record<string, UserAccountData> = {};
    if (accountsJson) {
      try {
        accounts = JSON.parse(accountsJson);
      } catch (e) {
        console.error("Error parsing accounts in saveUserData", e);
      }
    }

    if (accounts[currentEmail]) {
      accounts[currentEmail] = {
        ...accounts[currentEmail],
        usernames: updates.usernames !== undefined ? updates.usernames : accounts[currentEmail].usernames,
        masterAvatar: updates.masterAvatar !== undefined ? updates.masterAvatar : accounts[currentEmail].masterAvatar,
        accentColor: updates.accentColor !== undefined ? updates.accentColor : accounts[currentEmail].accentColor,
        themeMode: updates.themeMode !== undefined ? updates.themeMode : accounts[currentEmail].themeMode,
      };
      localStorage.setItem("profilesync_accounts", JSON.stringify(accounts));
    }
  };

  const login = async (newEmail: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const accountsJson = localStorage.getItem("profilesync_accounts");
    let accounts: Record<string, UserAccountData> = {};
    if (accountsJson) {
      try {
        accounts = JSON.parse(accountsJson);
      } catch {
        // Ignore
      }
    }

    const lowerEmail = newEmail.toLowerCase().trim();
    const user = accounts[lowerEmail];
    if (!user) {
      return { success: false, error: "Account with this email does not exist. Please sign up." };
    }

    if (user.password !== pass) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    // Capture temp upload if it exists
    let activeAvatar = user.masterAvatar || null;
    if (typeof window !== "undefined") {
      const tempAvatar = sessionStorage.getItem("temp_upload_avatar");
      if (tempAvatar) {
        if (!user.masterAvatar) {
          activeAvatar = tempAvatar;
          user.masterAvatar = tempAvatar;
          accounts[lowerEmail] = user;
          localStorage.setItem("profilesync_accounts", JSON.stringify(accounts));
        }
        sessionStorage.removeItem("temp_upload_avatar");
      }
    }

    // Success! Load state
    setIsAuthenticated(true);
    setEmail(lowerEmail);
    setUsernames({ ...defaultUsernames, ...user.usernames });
    setMasterAvatar(activeAvatar);
    setAccentColorState(user.accentColor || "blue");
    setThemeModeState(user.themeMode || "dark");
    localStorage.setItem("profilesync_active_email", lowerEmail);

    return { success: true };
  };

  const signup = async (newEmail: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const accountsJson = localStorage.getItem("profilesync_accounts");
    let accounts: Record<string, UserAccountData> = {};
    if (accountsJson) {
      try {
        accounts = JSON.parse(accountsJson);
      } catch {
        // Ignore
      }
    }

    const lowerEmail = newEmail.toLowerCase().trim();
    if (accounts[lowerEmail]) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Capture temp upload if it exists
    let tempAvatar = null;
    if (typeof window !== "undefined") {
      tempAvatar = sessionStorage.getItem("temp_upload_avatar");
      if (tempAvatar) {
        sessionStorage.removeItem("temp_upload_avatar");
      }
    }

    // Create user data
    accounts[lowerEmail] = {
      password: pass,
      usernames: defaultUsernames,
      masterAvatar: tempAvatar,
      accentColor: "blue",
      themeMode: "dark",
    };

    localStorage.setItem("profilesync_accounts", JSON.stringify(accounts));

    // Sign in automatically
    setIsAuthenticated(true);
    setEmail(lowerEmail);
    setUsernames(defaultUsernames);
    setMasterAvatar(tempAvatar);
    setAccentColorState("blue");
    setThemeModeState("dark");
    localStorage.setItem("profilesync_active_email", lowerEmail);

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setEmail(null);
    setUsernames(defaultUsernames);
    setMasterAvatar(null);
    setAccentColorState("blue");
    setThemeModeState("dark");
    localStorage.removeItem("profilesync_active_email");
  };

  const updateUsernames = (newUsernames: Partial<Usernames>) => {
    if (!email) return;
    setUsernames(prev => {
      const updated = { ...prev };
      (Object.keys(newUsernames) as Array<keyof Usernames>).forEach(key => {
        const val = newUsernames[key];
        if (val !== undefined) {
          updated[key] = val;
        }
      });
      saveUserData(email, { usernames: updated });
      return updated;
    });
  };

  const updateMasterAvatar = (base64: string | null) => {
    if (!email) return;
    setMasterAvatar(base64);
    saveUserData(email, { masterAvatar: base64 });
  };

  const setAccentColor = (color: AccentColorType) => {
    if (!email) return;
    setAccentColorState(color);
    saveUserData(email, { accentColor: color });
  };

  const setThemeMode = (theme: ThemeModeType) => {
    if (!email) return;
    setThemeModeState(theme);
    saveUserData(email, { themeMode: theme });
  };

  // Don't render children until we've loaded from localStorage to prevent hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return (
    <UserContext.Provider value={{ 
      isAuthenticated, 
      email, 
      usernames, 
      masterAvatar, 
      accentColor, 
      themeMode, 
      login, 
      signup, 
      logout, 
      updateUsernames, 
      updateMasterAvatar,
      setAccentColor,
      setThemeMode
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
