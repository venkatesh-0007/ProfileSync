"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { MoveRight, Mail, Lock, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login, signup, isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (email.trim() === "" || password.trim() === "") {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const res = await signup(email, password);
        if (res.success) {
          router.push("/dashboard");
        } else {
          setError(res.error || "Failed to sign up.");
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          router.push("/dashboard");
        } else {
          setError(res.error || "Failed to sign in.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white selection:bg-zinc-800 font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-900/20 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/" className="flex justify-center mb-8">
          <div className="w-24 h-24 flex items-center justify-center">
            <Image src="/logo.png" alt="ProfileSync Logo" width={96} height={96} className="object-contain drop-shadow-2xl" priority />
          </div>
        </Link>
        
        <div className="bg-zinc-950/80 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-zinc-400 font-medium">
              {isSignUp 
                ? "Enter your credentials to register your sync hub." 
                : "Sign in with your email and password."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-sm font-semibold flex items-center gap-3 overflow-hidden"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com" 
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 font-bold rounded-xl py-6 text-base mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
              {!loading && <MoveRight className="w-5 h-5" />}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm font-semibold">
            {isSignUp ? (
              <span className="text-zinc-500">
                Already have an account?{" "}
                <button 
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className="text-white hover:underline focus:outline-none"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span className="text-zinc-500">
                New to ProfileSync?{" "}
                <button 
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className="text-white hover:underline focus:outline-none"
                >
                  Create an account
                </button>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
