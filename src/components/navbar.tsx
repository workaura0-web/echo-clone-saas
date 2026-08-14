"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js"; // Supabase client

// Apne Supabase credentials se replace karein ya env variables use karein
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is Admin
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === "workaur0@gmail.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
    checkUser();

    // Auth state changes listen karne ke liye
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email === "workaur0@gmail.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "TTS Studio", href: "/studio/tts" },
    { name: "Login", href: "/login" },
    { name: "Library", href: "/library" },
  ];

  // Agar user admin hai, to Admin Payment link add kar dein
  if (isAdmin) {
    navLinks.push({ name: "Admin", href: "/admin/payment" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <motion.span 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-black px-2 py-0.5 rounded-lg text-sm font-extrabold"
          >
            ECHO
          </motion.span>
          <span>Clone</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium transition-colors hover:text-white px-2 py-1"
              >
                <span className={isActive ? "text-white font-semibold" : "text-zinc-400"}>
                  {link.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden sm:block">
            <Link
              href="/studio/tts"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all"
            >
              Create Voice
            </Link>
          </motion.div>

          {/* Mobile Menu Button (Hamburger) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-zinc-400 hover:text-white focus:outline-none p-1"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              {isOpen ? (
                <path fillRule="evenodd" clipRule="evenodd" d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"/>
              ) : (
                <path fillRule="evenodd" d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"/>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Animated Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col gap-4 overflow-hidden"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-white font-semibold" : "text-zinc-400"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link
              href="/studio/tts"
              onClick={() => setIsOpen(false)}
              className="mt-2 w-full text-center px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all"
            >
              Create Voice
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}