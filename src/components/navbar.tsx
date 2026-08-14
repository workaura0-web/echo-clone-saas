"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // 1. Direct Email Match Check
      if (user.email === "workaura0@gmail.com" || user.email === "workaur0@gmail.com") {
        setIsAdmin(true);
        return;
      }

      // 2. Database `profiles` Table Check
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profile && profile.is_admin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }

    checkUser();

    // Listen for Auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const baseLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "TTS Studio", href: "/studio/tts" },
    { name: "Login", href: "/login" },
    { name: "Library", href: "/library" },
  ];

  // Dynamically add Admin link if verified
  const navLinks = isAdmin
    ? [...baseLinks, { name: "Admin", href: "/admin/payment" }]
    : baseLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        
        {/* Animated Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 p-[1px] rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <span className="block bg-zinc-950 group-hover:bg-transparent text-white px-3 py-1 rounded-[11px] text-xs font-black tracking-wider transition-all duration-300">
              ECHO
            </span>
          </motion.div>
          <span className="font-bold text-lg text-zinc-100 tracking-tight group-hover:text-white transition-colors">
            Clone
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/50 border border-white/5 p-1.5 rounded-full backdrop-blur-md shadow-inner">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                  isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-gradient-to-r from-violet-600/80 to-indigo-600/80 rounded-full shadow-md shadow-indigo-500/20 -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="hidden sm:block">
            <Link
              href="/studio/tts"
              className="relative group overflow-hidden px-4 py-2 text-xs font-bold rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-md shadow-white/5 flex items-center gap-1.5"
            >
              <span>Create Voice</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-xs">→</span>
            </Link>
          </motion.div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-zinc-400 hover:text-white focus:outline-none p-2 rounded-xl bg-zinc-900/60 border border-white/10"
            aria-label="Toggle Menu"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              {isOpen ? (
                <path fillRule="evenodd" clipRule="evenodd" d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"/>
              ) : (
                <path fillRule="evenodd" d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"/>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Animated Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-b border-white/10 bg-zinc-950/95 backdrop-blur-2xl px-6 py-5 flex flex-col gap-2 overflow-hidden shadow-2xl"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-violet-600/20 border border-violet-500/30 text-white font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-2">
              <Link
                href="/studio/tts"
                onClick={() => setIsOpen(false)}
                className="w-full text-center block px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all"
              >
                Create Voice
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}