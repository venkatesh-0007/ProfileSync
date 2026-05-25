"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Code, Terminal, Zap, Shield, Image as ImageIcon, Sparkles, MoveRight } from "lucide-react";
import { GithubIcon as Github, LinkedinIcon as Linkedin } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function LandingPage() {
  const router = useRouter();

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      sessionStorage.setItem("temp_upload_avatar", base64);
      router.push("/signin");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-zinc-800 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/50">
            <ImageIcon className="w-5 h-5 text-zinc-100" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">ProfileSync</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
        </div>
        <div className="flex space-x-4">
          <Link href="/signin">
            <Button variant="ghost" className="hidden md:inline-flex text-zinc-300 hover:text-white hover:bg-zinc-900">Sign In</Button>
          </Link>
          <Link href="/signin">
            <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-6 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)]">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="w-full pt-32 pb-40 px-6 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle glow behind hero */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/30 rounded-full blur-[150px] pointer-events-none -z-10" />
          
          <motion.div 
            initial="initial" 
            animate="animate" 
            variants={stagger}
            className="max-w-5xl flex flex-col items-center w-full"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-900/50 backdrop-blur-md px-5 py-2 text-sm font-medium text-zinc-300 mb-10 shadow-2xl">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
              <span>The ultimate developer identity tool</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-tighter mb-8 leading-[0.9] text-white">
              FIX YOUR <br className="hidden md:block" />
              <span className="text-zinc-500">PROFILE ITCH.</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-lg md:text-2xl text-zinc-400 mb-16 max-w-3xl mx-auto font-medium tracking-tight">
              One photo. Five platforms. Instant synchronization.<br className="hidden md:block" />
              Built for developers who care about their brand.
            </motion.p>
            
            <motion.div variants={fadeIn} className="w-full max-w-2xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-zinc-500 to-zinc-700 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-zinc-950 border border-zinc-800/80 p-2 rounded-[2rem] shadow-2xl">
                <FileUpload onUpload={handleUpload} className="w-full bg-zinc-900/50 hover:bg-zinc-900 transition-colors border-dashed border-zinc-700" />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Bento Box Features */}
        <section id="features" className="w-full py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">Everything in one place.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                <Zap className="w-32 h-32 text-zinc-100" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight mb-4 text-white">One-Click Deploy</h3>
              <p className="text-zinc-400 text-lg max-w-md">Push your updated profile photo to all connected platforms simultaneously without leaving the dashboard.</p>
            </div>
            
            <div className="md:col-span-1 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 flex flex-col">
              <ImageIcon className="w-10 h-10 text-zinc-300 mb-6" />
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-white mt-auto">Smart Format</h3>
              <p className="text-zinc-400">Automatically resizes to meet exact requirements.</p>
            </div>

            <div className="md:col-span-1 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10">
              <Shield className="w-10 h-10 text-zinc-300 mb-6" />
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-white">Privacy First</h3>
              <p className="text-zinc-400">Your images are processed securely and never stored.</p>
            </div>

            <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold tracking-tight mb-4 text-white">Supported Ecosystem</h3>
                <p className="text-zinc-400 text-lg max-w-sm mb-8 md:mb-0">Seamlessly integrated with the tools you use every day to build software.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center"><Github className="w-6 h-6 text-white" /></div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center"><Linkedin className="w-6 h-6 text-white" /></div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center"><Code className="w-6 h-6 text-white" /></div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center"><Terminal className="w-6 h-6 text-white" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Minimalist */}
        <section id="how-it-works" className="w-full py-32 px-6">
          <div className="max-w-5xl mx-auto border border-zinc-800 bg-zinc-900/20 rounded-[3rem] p-12 md:p-20 text-center">
             <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-16 text-white">How it works</h2>
             
             <div className="grid md:grid-cols-3 gap-12 relative">
               <div className="hidden md:block absolute top-1/4 left-[15%] right-[15%] h-px bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 -z-10" />
               
               <div className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl font-bold text-white mb-8 shadow-xl">1</div>
                 <h4 className="text-xl font-bold mb-3 text-white">Upload</h4>
                 <p className="text-zinc-400">Drag and drop your best professional headshot.</p>
               </div>
               
               <div className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl font-bold text-white mb-8 shadow-xl">2</div>
                 <h4 className="text-xl font-bold mb-3 text-white">Connect</h4>
                 <p className="text-zinc-400">Securely link your developer and professional accounts.</p>
               </div>
               
               <div className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl font-bold text-white mb-8 shadow-xl">3</div>
                 <h4 className="text-xl font-bold mb-3 text-white">Sync</h4>
                 <p className="text-zinc-400">Review previews and update all profiles with one click.</p>
               </div>
             </div>

             <div className="mt-20">
               <Link href="/signin">
                 <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-8 py-6 text-lg font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                   Start Syncing Now <MoveRight className="ml-2 w-5 h-5" />
                 </Button>
               </Link>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-zinc-900 bg-black mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-zinc-500" />
            <span className="text-lg font-bold text-zinc-300">ProfileSync</span>
          </div>
          <p className="text-sm text-zinc-600 font-medium">© {new Date().getFullYear()} ProfileSync. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

