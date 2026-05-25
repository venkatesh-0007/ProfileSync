/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code, Terminal, Zap, 
  Settings, CheckCircle2,
  Image as ImageIcon, ExternalLink,
  UserCircle, Moon, Sun, LogOut, Save,
  RefreshCw, Sparkles
} from "lucide-react";
import { GithubIcon as Github, LinkedinIcon as Linkedin } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useUser, Usernames } from "@/context/UserContext";
import { compareImages } from "@/lib/image-compare";

const PLATFORMS = [
  { id: "linkedin", unavatarId: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-500", editUrl: "https://www.linkedin.com/in/me/edit/photo/" },
  { id: "github", unavatarId: "github", name: "GitHub", icon: Github, color: "text-zinc-800 dark:text-white", editUrl: "https://github.com/settings/profile" },
  { id: "leetcode", unavatarId: "leetcode", name: "LeetCode", icon: Code, color: "text-orange-500", editUrl: "https://leetcode.com/profile/" },
  { id: "codechef", unavatarId: "codechef", name: "CodeChef", icon: Terminal, color: "text-amber-700", editUrl: "https://www.codechef.com/" },
  { id: "codeforces", unavatarId: "codeforces", name: "Codeforces", icon: Zap, color: "text-red-500", editUrl: "https://codeforces.com/settings/general" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    email, 
    usernames, 
    masterAvatar, 
    accentColor,
    themeMode,
    updateMasterAvatar, 
    updateUsernames, 
    setAccentColor,
    setThemeMode,
    logout 
  } = useUser();
  
  const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");
  const [localUsernames, setLocalUsernames] = useState<Usernames>(usernames);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync settings local form state with usernames from context
  useEffect(() => {
    setLocalUsernames(usernames);
  }, [usernames]);

  // Track visual comparison results
  const [comparisonResults, setComparisonResults] = useState<Record<string, {
    status: "idle" | "checking" | "matched" | "mismatched" | "error" | "empty" | "fallback";
    difference?: number;
    errorMsg?: string;
  }>>({});

  const checkPlatformSync = async (platformId: string, username: string) => {
    if (!masterAvatar) return;

    setComparisonResults(prev => ({
      ...prev,
      [platformId]: { status: "checking" }
    }));

    try {
      // 1. Fetch JSON metadata first to see if profile is empty or fallback is returned
      const metaRes = await fetch(`/api/proxy-avatar?platform=${platformId}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email || "")}&json=true`);
      if (!metaRes.ok) {
        throw new Error("Failed to check profile status");
      }
      const meta = await metaRes.json();

      if (meta.isEmpty) {
        setComparisonResults(prev => ({
          ...prev,
          [platformId]: { 
            status: "empty",
            difference: 100
          }
        }));
        return;
      }

      if (meta.isFallback) {
        setComparisonResults(prev => ({
          ...prev,
          [platformId]: { 
            status: "fallback",
            difference: 100
          }
        }));
        return;
      }

      // 2. Perform comparison
      const liveProxyUrl = `/api/proxy-avatar?platform=${platformId}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email || "")}`;
      // Allow up to 25% difference (75% similarity threshold) for better match tolerance
      const res = await compareImages(masterAvatar, liveProxyUrl, 25);
      
      setComparisonResults(prev => ({
        ...prev,
        [platformId]: { 
          status: res.isSimilar ? "matched" : "mismatched",
          difference: res.difference
        }
      }));
    } catch (err: any) {
      console.error(`Failed to compare image for ${platformId}:`, err);
      const errorMsg = err instanceof Error 
        ? err.message 
        : (err?.type === "error" ? "Could not load or render profile picture" : "Failed to fetch/verify photo");
      setComparisonResults(prev => ({
        ...prev,
        [platformId]: { 
          status: "error", 
          errorMsg
        }
      }));
    }
  };

  // Reset comparison results when usernames or master avatar changes
  useEffect(() => {
    setComparisonResults({});
  }, [usernames, masterAvatar]);

  // Auto comparison trigger
  useEffect(() => {
    PLATFORMS.forEach(platform => {
      const username = usernames[platform.id];
      if (!username || !masterAvatar) return;

      const current = comparisonResults[platform.id];
      if (!current) {
        checkPlatformSync(platform.id, username);
      }
    });
  }, [usernames, masterAvatar, comparisonResults]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }
  
  // Calculate progress based on matched vs total active profiles
  const activePlatforms = PLATFORMS.filter(p => usernames[p.id]);
  const matchedCount = activePlatforms.filter(p => comparisonResults[p.id]?.status === "matched").length;
  const progress = masterAvatar && activePlatforms.length > 0 
    ? (matchedCount / activePlatforms.length) * 100 
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateMasterAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    updateMasterAvatar(null);
  };

  const handleUsernameChange = (id: string, value: string) => {
    setLocalUsernames(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveUsernames = () => {
    updateUsernames(localUsernames);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const renderPlatformCard = (platform: typeof PLATFORMS[number], index: number) => {
    const username = usernames[platform.id] || "";
    const liveImageUrl = username 
      ? `/api/proxy-avatar?platform=${platform.id}&username=${username}&email=${email || ""}` 
      : null;
    const statusObj = comparisonResults[platform.id];
    
    let cardBorderClass = "border-zinc-200 dark:border-zinc-900 bg-card hover:border-zinc-300 dark:hover:border-zinc-800";
    let badgeText = "Pending";
    let badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850";
    let statusDescription = "";
    let mainButton: React.ReactNode = null;

    if (!username) {
      cardBorderClass = "border-zinc-200/50 dark:border-zinc-950 bg-card opacity-60 hover:opacity-100 transition-opacity duration-300";
      badgeText = "Empty Profile";
      badgeClass = "bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 border border-zinc-200/80 dark:border-zinc-900/80";
      statusDescription = "No username linked yet. Configure this in the Settings tab.";
      mainButton = (
        <Button 
          onClick={() => setActiveTab("settings")} 
          className="w-full font-bold rounded-xl bg-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground border border-zinc-200 dark:border-zinc-800 py-6 transition-colors"
        >
          Setup Username
        </Button>
      );
    } else if (!masterAvatar) {
      badgeText = "Linked";
      badgeClass = "bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:border-blue-500/10";
      statusDescription = "Profile linked. Upload a Master Avatar to compare visual sync.";
      mainButton = (
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="w-full font-bold rounded-xl bg-accent-custom text-white hover:opacity-90 py-6 shadow-accent-custom transition-all"
        >
          Upload Master Photo
        </Button>
      );
    } else {
      const compStatus = statusObj?.status || "idle";

      if (compStatus === "checking") {
        badgeText = "Comparing...";
        badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 animate-pulse";
        statusDescription = "Verifying picture matches Master Avatar...";
        mainButton = (
          <Button 
            disabled 
            className="w-full font-bold rounded-xl bg-secondary text-zinc-400 py-6 flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-850"
          >
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
            Comparing...
          </Button>
        );
      } else if (compStatus === "empty") {
        cardBorderClass = "border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/5 hover:border-amber-500/40 transition-colors duration-300";
        badgeText = "Empty Profile";
        badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
        statusDescription = `No profile picture uploaded on ${platform.name}.`;
        const editUrlVal = (platform.id === "codechef" && username) ? `https://www.codechef.com/users/${username}/edit` : platform.editUrl;
        mainButton = (
          <a href={editUrlVal} target="_blank" rel="noreferrer" className="w-full block">
            <Button 
              className="w-full font-bold rounded-xl bg-accent-custom text-white hover:opacity-90 py-6 shadow-accent-custom transition-all"
            >
              Upload on {platform.name}
            </Button>
          </a>
        );
      } else if (compStatus === "fallback") {
        cardBorderClass = "border-zinc-250 dark:border-zinc-800 bg-card hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors duration-300";
        badgeText = "Unverified";
        badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800";
        statusDescription = `Profile picture is protected or private. Please manually verify.`;
        const editUrlVal = (platform.id === "codechef" && username) ? `https://www.codechef.com/users/${username}/edit` : platform.editUrl;
        mainButton = (
          <a href={editUrlVal} target="_blank" rel="noreferrer" className="w-full block">
            <Button 
              variant="outline"
              className="w-full font-bold rounded-xl text-accent-custom border border-accent-custom/25 bg-accent-custom/5 hover:bg-accent-custom/10 py-6 flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Verify on {platform.name}
            </Button>
          </a>
        );
      } else if (compStatus === "matched") {
        cardBorderClass = "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 hover:border-emerald-500/40 transition-colors duration-300";
        badgeText = "Synced";
        badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
        const similarity = Math.max(0, Math.round(100 - (statusObj?.difference || 0)));
        statusDescription = `Synced! Profile photo matches Master Avatar (${similarity}% match).`;
        mainButton = (
          <Button 
            variant="outline" 
            className="w-full font-bold rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 py-6 cursor-default transition-all"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> Matches Master
          </Button>
        );
      } else if (compStatus === "mismatched") {
        cardBorderClass = "border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/5 hover:border-amber-500/40 transition-colors duration-300";
        badgeText = "Out of Sync";
        badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
        const similarity = Math.max(0, Math.round(100 - (statusObj?.difference || 0)));
        statusDescription = `Different photo detected on platform (${similarity}% match).`;
        mainButton = (
          <Button 
            onClick={() => checkPlatformSync(platform.id, username)} 
            variant="outline" 
            className="w-full font-bold rounded-xl text-amber-600 dark:text-amber-450 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 py-6 flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Verify Sync
          </Button>
        );
      } else if (compStatus === "error") {
        cardBorderClass = "border-rose-500/30 dark:border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/5 hover:border-rose-500/40 transition-colors duration-300";
        badgeText = "Unverified";
        badgeClass = "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20";
        statusDescription = statusObj?.errorMsg || "Could not fetch or verify live photo.";
        mainButton = (
          <Button 
            onClick={() => checkPlatformSync(platform.id, username)} 
            className="w-full font-bold rounded-xl bg-secondary text-foreground border border-zinc-200 dark:border-zinc-800 py-6 flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Verification
          </Button>
        );
      } else {
        badgeText = "Pending";
        badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850";
        statusDescription = "Click verification to check image matching.";
        mainButton = (
          <Button 
            onClick={() => checkPlatformSync(platform.id, username)} 
            className="w-full font-bold rounded-xl bg-accent-custom text-white hover:opacity-90 py-6 flex items-center justify-center gap-2 transition-all"
          >
            Verify Sync
          </Button>
        );
      }
    }

    const editUrl = (platform.id === "codechef" && username)
      ? `https://www.codechef.com/users/${username}/edit`
      : platform.editUrl;

    return (
      <motion.div
        key={platform.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        <Card className={`flex flex-col h-full transition-all duration-500 border rounded-[2rem] overflow-hidden ${cardBorderClass}`}>
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="flex justify-between items-start">
              <div className={`p-4 rounded-2xl bg-secondary border border-zinc-200 dark:border-zinc-800 ${platform.color} shadow-inner`}>
                <platform.icon className="w-6 h-6" />
              </div>
              <Badge className={`px-4 py-1.5 rounded-full font-bold ${badgeClass}`}>
                {badgeText}
              </Badge>
            </div>
            <CardTitle className="mt-6 text-2xl font-bold text-foreground">{platform.name}</CardTitle>
          </CardHeader>
          
          <CardContent className="pb-6 px-6 flex-grow flex flex-col justify-between space-y-6">
             {/* Live Profile Picture Display */}
             <div className="flex items-center space-x-4 bg-secondary p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
               <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-855 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 overflow-hidden relative shrink-0">
                 {liveImageUrl ? (
                   <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={liveImageUrl} alt={`${username} on ${platform.name}`} className="w-full h-full object-cover animate-fade-in" onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                      }} />
                   </>
                 ) : (
                   <UserCircle className="w-8 h-8 text-zinc-500" />
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-foreground truncate">Live Picture</p>
                 <p className="text-xs text-zinc-500 truncate">
                   {username ? `@${username}` : "Not linked"}
                 </p>
               </div>
             </div>

             <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium min-h-[40px]">
               {statusDescription}
             </p>

             <div className="w-full mt-auto pt-2">
               {mainButton}
             </div>
          </CardContent>
          
          <CardFooter className="p-4 border-t border-zinc-100 dark:border-zinc-900 mt-auto bg-secondary/30">
            <div className="flex w-full gap-2">
               <a href={editUrl} target="_blank" rel="noreferrer" className="flex-1">
                 <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-zinc-500 hover:text-foreground rounded-lg" disabled={!username}>
                   <ExternalLink className="w-4 h-4 mr-2" />
                   Update on {platform.name}
                 </Button>
               </a>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300">

      {/* Main Content — full width */}
      <main className="flex-1 overflow-y-auto bg-background relative flex flex-col">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-custom/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Topbar */}
        <header className="flex justify-between items-center px-6 md:px-10 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-card/50 backdrop-blur-md sticky top-0 z-30 transition-colors duration-300">
          {/* Left: Logo + tab pills */}
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground hidden sm:block">ProfileSync</span>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "overview"
                    ? "bg-card text-foreground shadow-sm border border-zinc-200 dark:border-zinc-800"
                    : "text-zinc-500 hover:text-foreground"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "settings"
                    ? "bg-card text-foreground shadow-sm border border-zinc-200 dark:border-zinc-800"
                    : "text-zinc-500 hover:text-foreground"
                }`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Right: Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full border border-zinc-200 dark:border-zinc-800 bg-card hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {masterAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={masterAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-5 h-5 text-zinc-500" />
                )}
              </div>
              <span className="text-sm font-semibold hidden sm:inline-block max-w-[140px] truncate text-foreground">
                {email?.split("@")[0]}
              </span>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 shadow-xl z-50 text-foreground"
                  >
                    <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-900 mb-2">
                      <p className="text-xxs text-zinc-400 font-bold uppercase tracking-wider">Account</p>
                      <p className="text-sm font-bold truncate text-foreground">{email}</p>
                    </div>
                    <button
                      onClick={() => { setActiveTab("settings"); setIsDropdownOpen(false); }}
                      className="w-full text-left px-2 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="flex-1 p-6 md:p-10 space-y-10 relative z-10 max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-8">
            <div className="space-y-1">
              <motion.h1
                key={activeTab}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-black tracking-tighter text-foreground"
              >
                {activeTab === "overview" ? "Dashboard" : "Settings"}
              </motion.h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                {activeTab === "overview"
                  ? "Manage and sync your professional identity."
                  : "Configure your account and preferences."}
              </p>
            </div>
            {activeTab === "overview" && (
              <div className="flex flex-col items-end space-y-2 bg-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl min-w-[220px]">
                <div className="flex justify-between w-full">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Sync Progress</span>
                  <span className="text-sm font-black text-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2.5 w-full bg-secondary [&>div]:bg-accent-custom" />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="grid grid-cols-1 xl:grid-cols-5 gap-8"
              >
                {/* Left Side: Master Profile Column */}
                <div className="xl:col-span-1 space-y-6">
                  <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl bg-card rounded-[2.5rem] overflow-hidden sticky top-28">
                    <CardHeader className="pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold text-foreground">Master Profile</CardTitle>
                      <CardDescription className="text-zinc-500">Your single source of identity truth.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center px-8 pb-8 text-center">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group w-44 h-44 rounded-full border border-zinc-200 dark:border-zinc-700 bg-secondary flex items-center justify-center overflow-hidden shadow-2xl transition-all hover:border-accent-custom cursor-pointer"
                      >
                        {masterAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={masterAvatar} alt="Master Avatar" className="w-full h-full object-cover animate-fade-in" />
                        ) : (
                          <UserCircle className="w-20 h-20 text-zinc-500 transition-transform group-hover:scale-110 duration-500" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <input 
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="mt-6 w-full">
                        <p className="font-bold text-lg truncate text-foreground">{email?.split("@")[0]}</p>
                        <p className="text-xs text-zinc-500 truncate">{email}</p>
                      </div>

                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-6 w-full bg-accent-custom text-white hover:opacity-90 font-bold rounded-full py-6 shadow-accent-custom transition-all"
                      >
                        <ImageIcon className="mr-2 w-5 h-5" />
                        {masterAvatar ? "Change Photo" : "Upload Photo"}
                      </Button>

                      {masterAvatar && (
                        <Button 
                          onClick={handleRemoveAvatar}
                          variant="ghost" 
                          className="mt-3 w-full text-zinc-500 hover:text-red-400 font-medium rounded-full py-2 hover:bg-red-500/10"
                        >
                          Remove Photo
                        </Button>
                      )}

                      {/* Active Connection Stats */}
                      <div className="w-full border-t border-zinc-150 dark:border-zinc-900 mt-6 pt-6 grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-black text-foreground">{activePlatforms.length}</p>
                          <p className="text-xxs font-bold text-zinc-500 uppercase tracking-widest mt-1">Linked</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-foreground">{matchedCount}</p>
                          <p className="text-xxs font-bold text-zinc-500 uppercase tracking-widest mt-1">Synced</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side: Grouped Socials and Coding Platforms */}
                <div className="xl:col-span-4 space-y-10">
                  
                  {/* Social Networks Group */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold flex items-center text-foreground uppercase tracking-widest ml-1 text-zinc-400 dark:text-zinc-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-custom mr-3 shadow-accent-custom shrink-0" />
                      Social Networks
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {PLATFORMS.filter(p => p.id === "linkedin" || p.id === "github").map((platform, idx) => 
                        renderPlatformCard(platform, idx)
                      )}
                    </div>
                  </div>

                  {/* Coding Platforms Group */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold flex items-center text-foreground uppercase tracking-widest ml-1 text-zinc-400 dark:text-zinc-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-custom mr-3 shadow-accent-custom shrink-0" />
                      Coding Platforms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {PLATFORMS.filter(p => p.id !== "linkedin" && p.id !== "github").map((platform, idx) => 
                        renderPlatformCard(platform, idx)
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="max-w-3xl space-y-8"
              >
                {/* Account Settings */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-card rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-8 pt-8">
                    <CardTitle className="flex items-center text-2xl font-bold text-foreground">
                      <UserCircle className="w-6 h-6 mr-3 text-zinc-400" />
                      Account Details
                    </CardTitle>
                    <CardDescription className="text-zinc-500 mt-2">Manage your basic account information.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6 mt-4">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <input type="email" disabled value={email || ""} className="flex h-12 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-secondary px-4 py-2 text-sm text-zinc-500 cursor-not-allowed focus:outline-none" />
                      <p className="text-xs text-zinc-550 dark:text-zinc-600 font-medium">Your email address is managed by your authentication provider.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance Settings */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-card rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-8 pt-8">
                    <CardTitle className="flex items-center text-2xl font-bold text-foreground">
                      <Sparkles className="w-6 h-6 mr-3 text-zinc-400" />
                      Appearance Settings
                    </CardTitle>
                    <CardDescription className="text-zinc-500 mt-2">Personalize the look and feel of your dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6 mt-4">
                    {/* Theme selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Theme Mode</label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setThemeMode("light")}
                          className={`flex items-center space-x-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                            themeMode === "light" 
                              ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                              : "border-zinc-200 dark:border-zinc-800 bg-card text-zinc-500 hover:text-foreground"
                          }`}
                        >
                          <Sun className="w-4 h-4 mr-2" />
                          Light Mode
                        </button>
                        <button
                          onClick={() => setThemeMode("dark")}
                          className={`flex items-center space-x-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                            themeMode === "dark" 
                              ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                              : "border-zinc-200 dark:border-zinc-800 bg-card text-zinc-500 hover:text-foreground"
                          }`}
                        >
                          <Moon className="w-4 h-4 mr-2" />
                          Dark Mode
                        </button>
                      </div>
                    </div>

                    {/* Accent Colors */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Accent Color</label>
                      <div className="flex flex-wrap gap-3">
                        {(["blue", "violet", "emerald", "rose", "amber"] as const).map(color => {
                          const colorLabels = {
                            blue: { label: "Blue", hex: "bg-blue-500" },
                            violet: { label: "Violet", hex: "bg-violet-500" },
                            emerald: { label: "Emerald", hex: "bg-emerald-500" },
                            rose: { label: "Rose", hex: "bg-rose-500" },
                            amber: { label: "Amber", hex: "bg-amber-500" },
                          };
                          const isActive = accentColor === color;
                          return (
                            <button
                              key={color}
                              onClick={() => setAccentColor(color)}
                              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                isActive 
                                  ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                                  : "border-zinc-200 dark:border-zinc-800 bg-card text-zinc-500 hover:text-foreground"
                              }`}
                            >
                              <span className={`w-3 h-3 rounded-full ${colorLabels[color].hex}`} />
                              <span>{colorLabels[color].label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Profiles Settings */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-card rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-8 pt-8 border-b border-zinc-200 dark:border-zinc-900 pb-6">
                    <CardTitle className="flex items-center text-2xl font-bold text-foreground">
                      <Settings className="w-6 h-6 mr-3 text-zinc-400" />
                      Social Profiles
                    </CardTitle>
                    <CardDescription className="text-zinc-500 mt-2">Link your accounts to fetch live profile pictures.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 py-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {PLATFORMS.map(platform => (
                        <div key={`setting-${platform.id}`} className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <platform.icon className="w-4 h-4" />
                            {platform.name}
                          </label>
                          <input 
                            type="text" 
                            placeholder="username or profile link" 
                            value={localUsernames[platform.id] || ""}
                            onChange={(e) => handleUsernameChange(platform.id, e.target.value)}
                            className="w-full bg-secondary border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-450 dark:placeholder:text-zinc-700"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="px-8 py-6 bg-secondary/20 border-t border-zinc-200 dark:border-zinc-900 flex justify-end">
                    <Button onClick={handleSaveUsernames} className="bg-accent-custom text-white hover:opacity-95 font-bold rounded-xl px-8 py-6 shadow-accent-custom">
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>

                {/* Account Actions: Sign Out */}
                <Card className="border-zinc-200 dark:border-zinc-900 bg-card rounded-[2rem] overflow-hidden relative">
                  <CardHeader className="px-8 pt-8">
                    <CardTitle className="text-foreground flex items-center text-2xl font-bold">
                      <LogOut className="w-6 h-6 mr-3 text-zinc-500" />
                      Account Actions
                    </CardTitle>
                    <CardDescription className="text-zinc-500 mt-2">Manage your session settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 mt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-secondary/30 gap-4">
                      <div>
                        <p className="font-bold text-foreground text-lg">Sign Out</p>
                        <p className="text-sm text-zinc-500 mt-1 font-medium">End your current session.</p>
                      </div>
                      <Button onClick={handleLogout} className="rounded-xl font-bold px-6 py-6 w-full sm:w-auto transition-colors bg-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground border border-zinc-200 dark:border-zinc-800">
                        <LogOut className="w-5 h-5 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
