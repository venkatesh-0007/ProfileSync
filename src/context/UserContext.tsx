/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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

/** Fetch a user's profile document from Firestore */
async function fetchUserData(uid: string): Promise<UserAccountData | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    return snap.data() as UserAccountData;
  }
  return null;
}

/** Write initial profile document when a new user signs up */
async function createUserDocument(uid: string, data: UserAccountData): Promise<void> {
  await setDoc(doc(db, "users", uid), data);
}

/** Partially update a user's profile document in Firestore */
async function patchUserDocument(uid: string, data: Partial<UserAccountData>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as Record<string, unknown>);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Usernames>(defaultUsernames);
  const [masterAvatar, setMasterAvatarState] = useState<string | null>(null);
  const [accentColor, setAccentColorState] = useState<AccentColorType>("blue");
  const [themeMode, setThemeModeState] = useState<ThemeModeType>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Session listener ────────────────────────────────────────────────────────
  // onAuthStateChanged fires automatically:
  //   • on page load (restores session from Firebase's own persistence)
  //   • after sign-in / sign-up
  //   • after sign-out
  // This replaces ALL the localStorage session-restore logic.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await fetchUserData(user.uid);
        setFirebaseUser(user);
        setIsAuthenticated(true);
        setEmail(user.email);
        setUsernames({ ...defaultUsernames, ...userData?.usernames });
        setMasterAvatarState(userData?.masterAvatar ?? null);
        setAccentColorState(userData?.accentColor ?? "blue");
        setThemeModeState(userData?.themeMode ?? "dark");
      } else {
        setFirebaseUser(null);
        setIsAuthenticated(false);
        setEmail(null);
        setUsernames(defaultUsernames);
        setMasterAvatarState(null);
        setAccentColorState("blue");
        setThemeModeState("dark");
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // ─── Sync theme to DOM ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode, isLoaded]);

  // ─── Sync accent color to DOM CSS Variables ──────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
    root.style.setProperty("--accent-color", colors.hex);
    root.style.setProperty("--accent-glow", colors.glow);
  }, [accentColor, isLoaded]);

  // ─── Auth actions ────────────────────────────────────────────────────────────

  const login = async (loginEmail: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), pass);
      // onAuthStateChanged will handle loading the user data automatically
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        return { success: false, error: "Account with this email does not exist. Please sign up." };
      }
      if (code === "auth/wrong-password") {
        return { success: false, error: "Incorrect password. Please try again." };
      }
      if (code === "auth/too-many-requests") {
        return { success: false, error: "Too many failed attempts. Please wait a moment and try again." };
      }
      return { success: false, error: "Failed to sign in. Please check your credentials." };
    }
  };

  const signup = async (signupEmail: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), pass);

      // Create the user's Firestore profile document with default values
      const initialData: UserAccountData = {
        usernames: defaultUsernames,
        masterAvatar: null,
        accentColor: "blue",
        themeMode: "dark",
      };
      await createUserDocument(cred.user.uid, initialData);

      // onAuthStateChanged will pick up the new session automatically
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        return { success: false, error: "An account with this email already exists." };
      }
      if (code === "auth/weak-password") {
        return { success: false, error: "Password must be at least 6 characters." };
      }
      if (code === "auth/invalid-email") {
        return { success: false, error: "Please enter a valid email address." };
      }
      return { success: false, error: "Failed to create account. Please try again." };
    }
  };

  const logout = () => {
    signOut(auth);
    // onAuthStateChanged handles resetting all state
  };

  // ─── Data update actions ─────────────────────────────────────────────────────

  const updateUsernames = (newUsernames: Partial<Usernames>) => {
    if (!firebaseUser) return;
    setUsernames((prev) => {
      const updated = { ...prev };
      (Object.keys(newUsernames) as Array<keyof Usernames>).forEach((key) => {
        const val = newUsernames[key];
        if (val !== undefined) {
          updated[key] = val;
        }
      });
      patchUserDocument(firebaseUser.uid, { usernames: updated }).catch(console.error);
      return updated;
    });
  };

  const updateMasterAvatar = (base64: string | null) => {
    if (!firebaseUser) return;
    setMasterAvatarState(base64);
    patchUserDocument(firebaseUser.uid, { masterAvatar: base64 }).catch(console.error);
  };

  const setAccentColor = (color: AccentColorType) => {
    if (!firebaseUser) return;
    setAccentColorState(color);
    patchUserDocument(firebaseUser.uid, { accentColor: color }).catch(console.error);
  };

  const setThemeMode = (theme: ThemeModeType) => {
    if (!firebaseUser) return;
    setThemeModeState(theme);
    patchUserDocument(firebaseUser.uid, { themeMode: theme }).catch(console.error);
  };

  // Don't render children until Firebase has resolved the session
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
      setThemeMode,
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
