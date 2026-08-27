"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Mic, 
  Check, 
  Heart,
  Download
} from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setInstallHelp(true);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between overflow-hidden font-sans">
      
      {/* Background Glowing Ambient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-24 flex-1">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-purple-500/30 text-xs font-medium text-purple-300 backdrop-blur-md shadow-inner">
            <Sparkles className="w-4 h-4 text-pink-400" /> Next-Gen AI Voice Cloning & Speech Synthesis
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
            Transform Your Text into{" "}
            <span className="bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Hyper-Realistic
            </span>{" "}
            AI Voices
          </h1>

          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Create natural voiceovers in seconds or clone your own voice using state-of-the-art neural audio networks.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/studio/tts"
              className="px-7 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] text-white text-sm flex items-center gap-2 shadow-xl shadow-purple-500/25 transition-all"
            >
              Start <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/library"
              className="px-7 py-3.5 rounded-2xl font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-sm border border-white/10 backdrop-blur-md transition-all"
            >
              Explore Samples
            </Link>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstall}
                className="px-7 py-3.5 rounded-2xl font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-sm border border-cyan-400/30 backdrop-blur-md transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Install App
              </button>
            )}
          </div>
          {installHelp && !isInstalled && (
            <p className="mx-auto max-w-md text-xs text-cyan-200/80">
              Chrome menu se <strong>Install Echo Clone</strong> select karein. Install option thori der mein available ho sakta hai.
            </p>
          )}
        </div>

        {/* Features Section */}
        <div className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-4xl font-black text-slate-100">Why Choose Echo Clone?</h2>
            <p className="text-slate-400 text-xs md:text-sm">Everything you need to produce studio-grade audio content effortlessly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Instant Voice Cloning</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Upload a short audio sample of any voice and generate endless speech in that exact tone.</p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Ultra-Fast Generation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Real-time processing powered by high-speed neural networks delivers speech in milliseconds.</p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Enterprise Security</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Your uploaded voices and generated audio content are protected with strict encryption protocols.</p>
            </div>
          </div>
        </div>

        {/* Flexible Plans Section */}
        <div className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-4xl font-black text-slate-100">Flexible Plans for Everyone</h2>
            <p className="text-slate-400 text-xs md:text-sm">Start free and upgrade as your voice generation needs grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free Plan */}
            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-200">Free</h3>
                <div className="text-4xl font-black">$0 <span className="text-xs font-normal text-slate-500">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 10,000 Characters / mo</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Access to Standard Voices</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> MP3 Audio Downloads</li>
                </ul>
              </div>
              <Link href="/checkout?plan=free" className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-bold text-xs transition-colors">
                Get Plan
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-purple-500/40 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-100">Pro</h3>
                <div className="text-4xl font-black text-purple-400">$19 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 100,000 Characters / mo</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 5 Instant Voice Clones</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> High-Quality Audio Export</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Commercial Rights</li>
                </ul>
              </div>
              <Link href="/checkout?plan=pro" className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] text-center font-bold text-xs text-white shadow-lg shadow-purple-500/25 transition-all">
                Get Plan
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-200">Enterprise</h3>
                <div className="text-4xl font-black">$99 <span className="text-xs font-normal text-slate-500">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Characters</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Voice Clones</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated API Access</li>
                </ul>
              </div>
              <Link href="/checkout?plan=enterprise" className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-bold text-xs transition-colors">
                Get Plan
              </Link>
            </div>

          </div>
        </div>

      </main>

      {/* Footer Section */}
      <footer className="relative z-10 border-t border-white/10 py-8 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">© 2026 Echo Clone. All rights reserved.</p>
          
          <p className="text-xs text-slate-500 flex items-center gap-1 font-medium tracking-wide">
            made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
          </p>
        </div>
      </footer>

    </div>
  );
}