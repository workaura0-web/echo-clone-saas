"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "TTS Studio", href: "/studio/tts" },
    { name: "Login", href: "/login" },
    { name: "Library", href: "/library" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <span className="bg-white text-black px-2 py-0.5 rounded-lg text-sm font-extrabold">ECHO</span>
          <span>Clone</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? "text-white font-semibold" : "text-zinc-400"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div>
          <Link
            href="/studio/tts"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all"
          >
            Create Voice
          </Link>
        </div>
      </div>
    </header>
  );
}