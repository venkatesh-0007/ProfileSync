/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code, Terminal, Zap, 
  Settings, CheckCircle2,
  Image as ImageIcon, ExternalLink,
  UserCircle, Moon, Sun, LogOut, Save,
  RefreshCw, Sparkles, LayoutDashboard,
  UploadCloud, Trash2, Download,
  Menu, X
} from "lucide-react";
import { GithubIcon as Github, LinkedinIcon as Linkedin } from "@/components/icons";
import Starfield from "@/components/Starfield";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUser, Usernames } from "@/context/UserContext";
import { compareImages } from "@/lib/image-compare";

const PLATFORMS = [
  { 
    id: "linkedin", 
    unavatarId: "linkedin", 
    name: "LinkedIn", 
    icon: Linkedin, 
    color: "text-blue-500", 
    glowClass: "hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
    editUrl: "https://www.linkedin.com/in/me/edit/photo/" 
  },
  { 
    id: "github", 
    unavatarId: "github", 
    name: "GitHub", 
    icon: Github, 
    color: "text-zinc-850 dark:text-white", 
    glowClass: "hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]",
    editUrl: "https://github.com/settings/profile" 
  },
  { 
    id: "leetcode", 
    unavatarId: "leetcode", 
    name: "LeetCode", 
    icon: Code, 
    color: "text-orange-500", 
    glowClass: "hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]",
    editUrl: "https://leetcode.com/profile/" 
  },
  { 
    id: "codechef", 
    unavatarId: "codechef", 
    name: "CodeChef", 
    icon: Terminal, 
    color: "text-amber-755", 
    glowClass: "hover:border-amber-700/50 hover:shadow-[0_0_30px_rgba(180,83,9,0.2)]",
    editUrl: "https://www.codechef.com/" 
  },
  { 
    id: "codeforces", 
    unavatarId: "codeforces", 
    name: "Codeforces", 
    icon: Zap, 
    color: "text-red-500", 
    glowClass: "hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]",
    editUrl: "https://codeforces.com/settings/general" 
  },
];

const compressImage = (file: File, targetSize = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Center-crop to 1:1 square aspect ratio so portrait/landscape photos are not squashed
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image for resizing"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});

  const checkPlatformSync = async (platformId: string, username: string) => {
    if (!masterAvatar) return;

    setComparisonResults(prev => ({
      ...prev,
      [platformId]: { status: "checking" }
    }));

    try {
      setRefreshKeys(prev => ({ ...prev, [platformId]: Date.now() }));
      
      // 1. Fetch JSON metadata first to see if profile is empty or fallback is returned
      const metaRes = await fetch(`/api/proxy-avatar?platform=${platformId}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email || "")}&json=true&refresh=true`);
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

      // 2. Perform comparison - cached buffer is leveraged directly without re-fetching
      const liveProxyUrl = `/api/proxy-avatar?platform=${platformId}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email || "")}`;
      // Allow up to 25% difference (75% similarity threshold as documented in README) for robust cross-platform matching
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
        : (err?.type === "error" ? "Could not render profile photo" : "Failed to verify photo");
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }
      try {
        const compressedBase64 = await compressImage(file);
        updateMasterAvatar(compressedBase64);
      } catch (err) {
        console.error("Failed to compress image:", err);
        alert("Could not load or compress image. Please try another one.");
      } finally {
        e.target.value = ""; // Reset file input so that upload works for the same image path
      }
    }
  };

  const handleRemoveAvatar = () => {
    updateMasterAvatar(null);
  };

  const handleDownloadMaster = () => {
    if (!masterAvatar) return;
    const link = document.createElement("a");
    link.href = masterAvatar;
    link.download = "master-avatar.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const currentRefreshKey = refreshKeys[platform.id] || 0;
    const liveImageUrl = username 
      ? `/api/proxy-avatar?platform=${platform.id}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email || "")}${currentRefreshKey ? `&_t=${currentRefreshKey}` : ''}` 
      : null;
    const statusObj = comparisonResults[platform.id];
    const compStatus = statusObj?.status || "idle";
    const similarity = Math.max(0, Math.round(100 - (statusObj?.difference || 0)));
    
    let cardBorderClass = "border-zinc-200 dark:border-zinc-900 bg-card/65 dark:bg-card/45 backdrop-blur-md hover:border-zinc-300 dark:hover:border-zinc-800 shadow-md";
    let badgeText = "Pending";
    let badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800";
    let statusDescription = "";
    let mainButton: React.ReactNode = null;

    if (!username) {
      cardBorderClass = "border-zinc-200/50 dark:border-zinc-950 bg-card/40 dark:bg-card/20 opacity-55 hover:opacity-100 transition-all duration-300";
      badgeText = "Empty Profile";
      badgeClass = "bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-650 border border-zinc-200/80 dark:border-zinc-900/80";
      statusDescription = "No username linked yet. Add it in the Settings panel.";
      mainButton = (
        <Button 
          onClick={() => setActiveTab("settings")} 
          className="w-full font-bold rounded-xl bg-secondary hover:bg-zinc-250 dark:hover:bg-zinc-800 text-foreground border border-zinc-200 dark:border-zinc-800 py-5 transition-colors text-xs"
        >
          Configure Username
        </Button>
      );
    } else if (!masterAvatar) {
      badgeText = "Linked";
      badgeClass = "bg-blue-500/10 text-blue-500 border border-blue-500/25";
      statusDescription = "Account connected. Upload a master avatar to begin visual verification.";
      mainButton = (
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="w-full font-bold rounded-xl bg-accent-custom text-white hover:opacity-90 py-5 shadow-accent-custom transition-all text-xs"
        >
          Upload Master Photo
        </Button>
      );
    } else {
      if (compStatus === "checking") {
        badgeText = "Scanning...";
        badgeClass = "bg-accent-custom/10 text-accent-custom border border-accent-custom/20 animate-pulse";
        statusDescription = "Scanning profile photo and matching visual vectors...";
        mainButton = (
          <Button 
            disabled 
            className="w-full font-bold rounded-xl bg-secondary text-zinc-400 py-5 flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-855 text-xs"
          >
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-405" />
            Comparing...
          </Button>
        );
      } else if (compStatus === "empty") {
        cardBorderClass = "border-amber-500/20 dark:border-amber-500/15 bg-amber-500/5 dark:bg-amber-955/5 shadow-md shadow-amber-500/5";
        badgeText = "Empty Profile";
        badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
        statusDescription = `No profile picture uploaded on ${platform.name}.`;
        const editUrlVal = (platform.id === "codechef" && username) ? `https://www.codechef.com/users/${username}/edit` : platform.editUrl;
        mainButton = (
          <a href={editUrlVal} target="_blank" rel="noreferrer" className="w-full block">
            <Button 
              className="w-full font-bold rounded-xl bg-accent-custom text-white hover:opacity-90 py-5 shadow-accent-custom transition-all text-xs"
            >
              Upload on {platform.name}
            </Button>
          </a>
        );
      } else if (compStatus === "fallback") {
        cardBorderClass = "border-zinc-300 dark:border-zinc-800 bg-card/65 dark:bg-card/45";
        badgeText = "Unverified";
        badgeClass = "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800";
        statusDescription = `Profile is private or protected. Verify manually.`;
        const editUrlVal = (platform.id === "codechef" && username) ? `https://www.codechef.com/users/${username}/edit` : platform.editUrl;
        mainButton = (
          <a href={editUrlVal} target="_blank" rel="noreferrer" className="w-full block">
            <Button 
              variant="outline"
              className="w-full font-bold rounded-xl text-accent-custom border border-accent-custom/25 bg-accent-custom/5 hover:bg-accent-custom/10 py-5 flex items-center justify-center gap-2 transition-all text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Verify on {platform.name}
            </Button>
          </a>
        );
      } else if (compStatus === "matched") {
        cardBorderClass = "border-emerald-500/40 dark:border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-955/10 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-950/10";
        badgeText = "Synced";
        badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
        statusDescription = `Success! Visually synchronized with Master Avatar.`;
        mainButton = (
          <Button 
            variant="outline" 
            className="w-full font-bold rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 py-5 cursor-default transition-all text-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Matches Master
          </Button>
        );
      } else if (compStatus === "mismatched") {
        cardBorderClass = "border-amber-500/40 dark:border-amber-500/25 bg-amber-500/5 dark:bg-amber-955/10 shadow-lg shadow-amber-500/10 dark:shadow-amber-950/10";
        badgeText = "Out of Sync";
        badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
        statusDescription = `Mismatched content detected on platform.`;
        mainButton = (
          <Button 
            onClick={() => checkPlatformSync(platform.id, username)} 
            variant="outline" 
            className="w-full font-bold rounded-xl text-amber-600 dark:text-amber-450 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 py-5 flex items-center justify-center gap-2 transition-all text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Verify Sync
          </Button>
        );
      } else if (compStatus === "error") {
        cardBorderClass = "border-rose-500/40 dark:border-rose-500/25 bg-rose-500/5 dark:bg-rose-955/10 shadow-md shadow-rose-500/5";
        badgeText = "Error";
        badgeClass = "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20";
        statusDescription = statusObj?.errorMsg || "Connection timed out fetching photo.";
        mainButton = (
          <Button 
            onClick={() => checkPlatformSync(platform.id, username)} 
            className="w-full font-bold rounded-xl bg-secondary text-foreground border border-zinc-200 dark:border-zinc-800 py-5 flex items-center justify-center gap-2 transition-all text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
        className="h-full"
      >
        <Card className={`flex flex-col h-full transition-all duration-300 border rounded-3xl overflow-hidden hover:scale-[1.01] ${platform.glowClass} ${cardBorderClass}`}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-secondary border border-zinc-200 dark:border-zinc-800 ${platform.color} shadow-inner`}>
                  <platform.icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">{platform.name}</CardTitle>
                  <p className="text-xs text-zinc-550 dark:text-zinc-500 truncate max-w-[120px]">
                    {username ? `@${username}` : "Unlinked"}
                  </p>
                </div>
              </div>
              <Badge className={`px-3 py-1 rounded-full font-bold text-xxs ${badgeClass}`}>
                {badgeText}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pb-4 px-5 flex-grow flex flex-col justify-between space-y-4">
             {/* Dynamic Overlapping Comparison Display */}
             <div className="flex items-center justify-center gap-4 bg-secondary/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 relative overflow-hidden my-1">
               {/* Left: Master Avatar */}
               <div className="flex flex-col items-center gap-1.5 shrink-0">
                 <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent-custom/50 shadow-md relative bg-secondary">
                   {masterAvatar ? (
                     <img src={masterAvatar} alt="Master Photo" className="w-full h-full object-cover" />
                   ) : (
                     <UserCircle className="w-full h-full text-zinc-450 dark:text-zinc-600" />
                   )}
                 </div>
                 <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">Master</span>
               </div>

               {/* Center Bridge: Displays Sync % and Line */}
               <div className="flex flex-col items-center justify-center flex-1 min-w-[50px]">
                 {compStatus === "checking" ? (
                   <div className="w-8 h-8 rounded-full border-2 border-t-accent-custom border-zinc-200 dark:border-zinc-800 animate-spin" />
                 ) : compStatus === "matched" ? (
                   <div className="flex flex-col items-center w-full">
                     <span className="text-xxs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
                       {similarity}%
                     </span>
                     <div className="h-[2px] w-full bg-emerald-500/30 dark:bg-emerald-500/20 mt-2 shadow-[0_0_8px_#10b981]" />
                   </div>
                 ) : compStatus === "mismatched" ? (
                   <div className="flex flex-col items-center w-full">
                     <span className="text-xxs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10">
                       {similarity}%
                     </span>
                     <div className="h-[2px] w-full bg-amber-500/30 dark:bg-amber-500/20 mt-2 shadow-[0_0_8px_#f59e0b]" />
                   </div>
                 ) : compStatus === "empty" ? (
                   <div className="flex flex-col items-center w-full">
                     <span className="text-xxs font-bold text-zinc-450">None</span>
                     <div className="h-[2px] w-full bg-zinc-200 dark:bg-zinc-800 mt-2" />
                   </div>
                 ) : (
                   <div className="h-[2px] w-full bg-zinc-200 dark:bg-zinc-800" />
                 )}
               </div>

               {/* Right: Live Platform Avatar */}
               <div className="flex flex-col items-center gap-1.5 shrink-0">
                 <div className={`w-16 h-16 rounded-full overflow-hidden border-2 relative bg-secondary transition-colors duration-300 ${
                   compStatus === "matched" ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" :
                   compStatus === "mismatched" ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" :
                   compStatus === "error" ? "border-rose-500" : "border-zinc-200 dark:border-zinc-800"
                 }`}>
                   {liveImageUrl ? (
                     <img 
                       src={liveImageUrl} 
                       alt={`${platform.name} Avatar`} 
                       className="w-full h-full object-cover" 
                       onError={(e) => {
                         (e.target as HTMLImageElement).src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                       }} 
                     />
                   ) : (
                     <UserCircle className="w-full h-full text-zinc-450 dark:text-zinc-650" />
                   )}
                   
                   {/* Verification Laser Scanner effect */}
                   {compStatus === "checking" && (
                     <div className="absolute inset-0 bg-black/40 overflow-hidden flex flex-col justify-between">
                       <motion.div 
                         initial={{ y: "-100%" }}
                         animate={{ y: "100%" }}
                         transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                         className="absolute left-0 right-0 h-0.5 bg-accent-custom shadow-[0_0_8px_var(--accent-color)]"
                       />
                     </div>
                   )}
                 </div>
                 <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">Live</span>
               </div>
             </div>

             <p className="text-xxs text-zinc-550 dark:text-zinc-450 font-medium min-h-[28px] text-center leading-normal">
               {statusDescription}
             </p>

             <div className="w-full pt-1">
               {mainButton}
             </div>
          </CardContent>
          
          <CardFooter className="p-3.5 border-t border-zinc-100 dark:border-zinc-900 bg-secondary/20 flex items-center justify-between gap-2">
            <a href={editUrl} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full text-xxs font-bold text-zinc-505 hover:text-foreground rounded-lg" disabled={!username}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile Photo
              </Button>
            </a>
            {masterAvatar && username && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMaster}
                className="h-8 px-2.5 text-xxs font-bold border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-secondary shrink-0 text-zinc-500 hover:text-foreground"
                title="Download Master Avatar to upload here"
              >
                <Download className="w-3 h-3 mr-1" />
                Get Master
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans text-foreground selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300 relative overflow-hidden">
      
      {/* File Input (Shared across all trigger buttons) */}
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <Starfield />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] bg-accent-custom/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-accent-custom/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ─── DESKTOP SIDEBAR NAVIGATION ─── */}
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-900 bg-card/50 dark:bg-card/30 backdrop-blur-xl h-screen sticky top-0 hidden lg:flex flex-col justify-between p-6 z-20 transition-colors duration-300">
        <div className="space-y-8">
          {/* Logo Brand Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 flex items-center justify-center relative">
              <NextImage src="/logo.png" alt="ProfileSync Logo" width={38} height={38} className="object-contain drop-shadow-md" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-foreground bg-gradient-to-r from-foreground to-zinc-500 bg-clip-text">
                ProfileSync
              </span>
              <p className="text-[10px] font-bold text-accent-custom uppercase tracking-wider">Identity Sync</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-accent-custom/10 text-accent-custom shadow-[inset_0_0_12px_var(--accent-glow)] border border-accent-custom/20"
                  : "text-zinc-500 hover:text-foreground hover:bg-secondary/50 border border-transparent"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-accent-custom/10 text-accent-custom shadow-[inset_0_0_12px_var(--accent-glow)] border border-accent-custom/20"
                  : "text-zinc-500 hover:text-foreground hover:bg-secondary/50 border border-transparent"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-900 pt-6">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 bg-secondary flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {masterAvatar ? (
                <img src={masterAvatar} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">{email?.split("@")[0]}</p>
              <p className="text-[10px] text-zinc-500 truncate">{email}</p>
            </div>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full font-bold text-xs text-rose-500 hover:bg-rose-500/10 rounded-2xl py-5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ─── MOBILE CONTAINER HEADER ─── */}
      <header className="lg:hidden flex justify-between items-center px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-900 bg-card/60 backdrop-blur-md sticky top-0 z-30 transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <NextImage src="/logo.png" alt="Logo" width={28} height={28} className="object-contain" />
          <span className="text-base font-black text-foreground">ProfileSync</span>
        </div>

        {/* Mobile quick actions */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-secondary border border-zinc-250 dark:border-zinc-800 text-zinc-500 hover:text-foreground"
            title="Upload Photo"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-secondary border border-zinc-250 dark:border-zinc-800 text-zinc-500 hover:text-foreground"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 top-[57px] bg-black/60 backdrop-blur-xs z-40"
              />
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="absolute left-0 right-0 top-[57px] bg-card p-5 border-b border-zinc-200 dark:border-zinc-800 z-50 shadow-2xl flex flex-col space-y-4 text-foreground"
              >
                <div className="flex items-center space-x-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                  <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {masterAvatar ? (
                      <img src={masterAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{email?.split("@")[0]}</p>
                    <p className="text-xxs text-zinc-550">{email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveTab("overview"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold ${activeTab === "overview" ? "bg-secondary text-foreground" : "text-zinc-505"}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold ${activeTab === "settings" ? "bg-secondary text-foreground" : "text-zinc-505"}`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  className="w-full font-bold text-xs text-rose-500 justify-start rounded-xl py-5 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* ─── MAIN CONTENT VIEWPORT ─── */}
      <main className="flex-1 overflow-y-auto bg-background relative z-10 flex flex-col pb-20 lg:pb-0 h-screen">
        
        {/* Header Summary Row */}
        <div className="px-6 md:px-10 pt-8 pb-4 border-b border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {activeTab === "overview" ? "Overview" : "Settings"}
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              {activeTab === "overview"
                ? "Validate profile identity visuals across coding networks."
                : "Manage credentials, links, and appearance preferences."}
            </p>
          </div>
          
          {activeTab === "overview" && (
            <div className="flex items-center gap-3 bg-card/60 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-sm min-w-[200px] w-full sm:w-auto">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1 text-xxs font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Match Rate</span>
                  <span className="text-foreground font-black">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-secondary [&>div]:bg-accent-custom" />
              </div>
            </div>
          )}
        </div>

        {/* Tab Pages Container */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start"
              >
                {/* 1. Bento Master Avatar controller (Occupies 1 column) */}
                <div className="xl:col-span-1">
                  <Card className="border-2 border-accent-custom shadow-accent-custom bg-card/65 dark:bg-card/45 backdrop-blur-md rounded-3xl overflow-hidden">
                    <CardHeader className="pb-4 pt-6 px-5 text-center border-b border-zinc-200 dark:border-zinc-900 bg-secondary/10">
                      <CardTitle className="text-lg font-black text-foreground">Master Identity</CardTitle>
                      <CardDescription className="text-xxs text-zinc-550">Single source of avatar truth</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex flex-col items-center px-5 pt-6 pb-6 text-center">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group w-40 h-40 rounded-full border-2 border-zinc-200 dark:border-zinc-800 hover:border-accent-custom bg-secondary flex items-center justify-center overflow-hidden shadow-lg cursor-pointer transition-all duration-300"
                      >
                        {masterAvatar ? (
                          <img src={masterAvatar} alt="Master avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-16 h-16 text-zinc-450 dark:text-zinc-650 group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div className="mt-4 w-full">
                        <p className="font-bold text-sm truncate text-foreground">{email?.split("@")[0]}</p>
                        <p className="text-xxs text-zinc-500 truncate">{email}</p>
                      </div>

                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-5 w-full bg-accent-custom text-white hover:opacity-90 font-bold rounded-xl py-5 shadow-accent-custom transition-all text-xs"
                      >
                        <UploadCloud className="mr-1.5 w-4 h-4" />
                        {masterAvatar ? "Change Photo" : "Upload Photo"}
                      </Button>

                      {masterAvatar && (
                        <Button 
                          onClick={handleDownloadMaster}
                          variant="outline" 
                          className="mt-2.5 w-full font-bold rounded-xl py-5 border border-zinc-200 dark:border-zinc-800 text-foreground hover:bg-secondary/70 flex items-center justify-center gap-2 text-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Master Photo
                        </Button>
                      )}

                      {masterAvatar && (
                        <Button 
                          onClick={handleRemoveAvatar}
                          variant="ghost" 
                          className="mt-1 w-full text-zinc-500 hover:text-red-400 font-bold rounded-xl py-3 text-xxs hover:bg-red-500/10"
                        >
                          <Trash2 className="mr-1 w-3.5 h-3.5" />
                          Remove Photo
                        </Button>
                      )}

                      {/* Connection Stats banner */}
                      <div className="w-full border-t border-zinc-200 dark:border-zinc-900 mt-5 pt-4 grid grid-cols-2 gap-2 text-center bg-secondary/10 rounded-2xl p-2">
                        <div>
                          <p className="text-lg font-black text-foreground">{activePlatforms.length}</p>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Linked</p>
                        </div>
                        <div>
                          <p className="text-lg font-black text-foreground">{matchedCount}</p>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Synced</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Bento Platforms Grid (Occupies remaining 3 columns) */}
                <div className="xl:col-span-3 space-y-6">
                  {/* Social Platforms Row */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-bold flex items-center text-foreground uppercase tracking-widest ml-1 text-zinc-400 dark:text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-accent-custom mr-2.5 shadow-accent-custom" />
                      Social Platforms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {PLATFORMS.filter(p => p.id === "linkedin" || p.id === "github").map((platform, idx) => 
                        renderPlatformCard(platform, idx)
                      )}
                    </div>
                  </div>

                  {/* Coding Networks Row */}
                  <div className="space-y-4 pt-4">
                    <h2 className="text-xs font-bold flex items-center text-foreground uppercase tracking-widest ml-1 text-zinc-400 dark:text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-accent-custom mr-2.5 shadow-accent-custom" />
                      Coding Networks
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
                transition={{ duration: 0.25 }}
                className="max-w-4xl space-y-8"
              >
                {/* 1. Account Details */}
                <Card className="border border-zinc-200 dark:border-zinc-900 bg-card/65 dark:bg-card/45 backdrop-blur-md rounded-3xl overflow-hidden">
                  <CardHeader className="px-6 pt-6">
                    <CardTitle className="flex items-center text-lg font-bold text-foreground">
                      <UserCircle className="w-5 h-5 mr-2.5 text-zinc-450" />
                      User Details
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-500 mt-1">Manage user account properties.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        disabled 
                        value={email || ""} 
                        className="flex h-11 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-secondary/50 px-4 text-xs text-zinc-500 cursor-not-allowed focus:outline-none" 
                      />
                      <p className="text-[10px] text-zinc-500 font-medium">Email login credentials are authenticated through Firebase.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Appearance Preference */}
                <Card className="border border-zinc-200 dark:border-zinc-900 bg-card/65 dark:bg-card/45 backdrop-blur-md rounded-3xl overflow-hidden">
                  <CardHeader className="px-6 pt-6">
                    <CardTitle className="flex items-center text-lg font-bold text-foreground">
                      <Sparkles className="w-5 h-5 mr-2.5 text-zinc-450" />
                      Design Customizer
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-500 mt-1">Personalize colors and display layouts.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-2 space-y-6">
                    {/* Theme Mode toggle button */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Theme Mode</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setThemeMode("light")}
                          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            themeMode === "light" 
                              ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                              : "border-zinc-200 dark:border-zinc-850 bg-card/30 text-zinc-505 hover:text-foreground"
                          }`}
                        >
                          <Sun className="w-4 h-4 mr-1" />
                          Light Mode
                        </button>
                        <button
                          onClick={() => setThemeMode("dark")}
                          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            themeMode === "dark" 
                              ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                              : "border-zinc-200 dark:border-zinc-855 bg-card/30 text-zinc-505 hover:text-foreground"
                          }`}
                        >
                          <Moon className="w-4 h-4 mr-1" />
                          Dark Mode
                        </button>
                      </div>
                    </div>

                    {/* Accent Colors circles */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Accent Swatch</label>
                      <div className="flex flex-wrap gap-2.5">
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
                              className={`flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                                isActive 
                                  ? "border-accent-custom bg-accent-custom/10 text-accent-custom shadow-accent-custom" 
                                  : "border-zinc-200 dark:border-zinc-855 bg-card/30 text-zinc-505 hover:text-foreground"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${colorLabels[color].hex}`} />
                              <span>{colorLabels[color].label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Link Social Profiles */}
                <Card className="border border-zinc-200 dark:border-zinc-900 bg-card/65 dark:bg-card/45 backdrop-blur-md rounded-3xl overflow-hidden">
                  <CardHeader className="px-6 pt-6 border-b border-zinc-200 dark:border-zinc-900 pb-4">
                    <CardTitle className="flex items-center text-lg font-bold text-foreground">
                      <Settings className="w-5 h-5 mr-2.5 text-zinc-455" />
                      Linked Usernames
                    </CardTitle>
                    <CardDescription className="text-xxs text-zinc-500 mt-1">Configure profile handles or full profile URLs.</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="px-6 py-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {PLATFORMS.map(platform => (
                        <div key={`setting-${platform.id}`} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <platform.icon className="w-3.5 h-3.5" />
                            {platform.name} Username
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. handle or profile url" 
                            value={localUsernames[platform.id] || ""}
                            onChange={(e) => handleUsernameChange(platform.id, e.target.value)}
                            className="w-full bg-secondary/30 border border-zinc-200 dark:border-zinc-800/85 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-zinc-450 transition-colors placeholder:text-zinc-400"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="px-6 py-4 bg-secondary/10 border-t border-zinc-200 dark:border-zinc-900 flex justify-end">
                    <Button onClick={handleSaveUsernames} className="bg-accent-custom text-white hover:opacity-95 font-bold rounded-xl px-6 py-4 shadow-accent-custom text-xs">
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Configurations
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAVIGATION TAB BAR ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-zinc-200 dark:border-zinc-900 bg-card/85 backdrop-blur-lg z-30 flex items-center justify-around px-4 transition-colors duration-300">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center justify-center w-20 h-full space-y-1 text-center font-bold text-[10px] transition-colors ${
            activeTab === "overview" ? "text-accent-custom" : "text-zinc-505"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center w-20 h-full space-y-1 text-center font-bold text-[10px] transition-colors ${
            activeTab === "settings" ? "text-accent-custom" : "text-zinc-505"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-20 h-full space-y-1 text-center font-bold text-[10px] text-rose-500"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </nav>
      
    </div>
  );
}
