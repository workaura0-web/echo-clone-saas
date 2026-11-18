"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { logOut } from "@/lib/firebase/auth";
import {
  AppNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/firebase/db";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import { useAppState } from "@/components/app-state-provider";
import UserAvatar from "@/components/user-avatar";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, profile, notifications } = useAppState();
  const userId = user?.uid ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const baseLinks = userId
    ? [
        { name: "Home", href: "/" },
        { name: "Studio", href: "/studio/tts" },
        { name: "Library", href: "/library" },
        { name: "Packages", href: "/checkout" },
        { name: "Dashboard", href: "/dashboard" },
      ]
    : [
        { name: "Home", href: "/" },
        { name: "Studio", href: "/studio/tts" },
        { name: "Packages", href: "/checkout" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
      ];

  const navLinks =
    userId && isAdmin
      ? [...baseLinks, { name: "Admin", href: "/admin/payment" }]
      : baseLinks;

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markNotificationRead(n.id).catch(() => undefined);
    }
    setNotifOpen(false);
    if (n.actionHref) {
      router.push(n.actionHref);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      setIsOpen(false);
      setNotifOpen(false);
      await logOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const accountLabel = profile?.username
    ? `@${profile.username}`
    : profile?.displayName || "Account";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--echo-border)] bg-[var(--echo-nav-bg)] backdrop-blur-xl shadow-sm dark:shadow-lg dark:shadow-indigo-950/25 transition-colors">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6">
        {/* Zone 1: Gradient-Framed Brand Logo & Wordmark */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group"
        >
          <span className="p-[1.5px] rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-violet-500/20 group-hover:shadow-cyan-500/30 transition-shadow">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Logo"
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-[10px] object-cover block bg-slate-950"
            />
          </span>
          <span>
            <span className="text-slate-900 dark:text-white">Echo</span>{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 dark:from-violet-300 dark:via-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent">
              Clone
            </span>
          </span>
        </Link>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                  isActive
                    ? "text-slate-950 dark:text-white border-violet-600 dark:border-cyan-400 font-semibold"
                    : "border-transparent hover:text-slate-950 dark:hover:text-cyan-200 hover:border-violet-400/60"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + Notification Bell + Account / Auth Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          {userId ? (
            <>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-label="Notifications"
                  className="relative p-2 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-violet-400 dark:hover:border-slate-700 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Account Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllNotificationsRead(notifications)}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          You are all caught up. Package expiry and quota alerts appear here.
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 ${
                              !n.isRead ? "bg-violet-50/60 dark:bg-slate-800/30" : ""
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {n.type === "expired" || n.type === "warning" ? (
                                <AlertTriangle
                                  className={`w-4 h-4 ${
                                    n.type === "expired" ? "text-rose-400" : "text-amber-400"
                                  }`}
                                />
                              ) : n.type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-violet-400" />
                              )}
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {profile && (
                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>Plan: {profile.planName}</span>
                        <Link
                          href="/dashboard"
                          onClick={() => setNotifOpen(false)}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                        >
                          Manage Plan
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/dashboard"
                prefetch={true}
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white/90 dark:bg-slate-900/75 text-slate-700 dark:text-slate-200 hover:border-violet-400 dark:hover:border-cyan-400/50 hover:text-slate-950 dark:hover:text-white transition-colors max-w-[165px]"
                title="Open Account Dashboard"
              >
                <UserAvatar
                  photoURL={profile?.photoURL || user?.photoURL}
                  displayName={profile?.displayName || user?.displayName}
                  sizeClass="w-5 h-5"
                  textClass="text-[10px]"
                  roundedClass="rounded-md"
                />
                <span className="truncate hidden lg:inline">{accountLabel}</span>
              </Link>

              <Link
                href="/studio/tts"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:brightness-110 text-white shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0"
              >
                <span>Open Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign Out"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-rose-400 dark:hover:border-rose-500/45 hover:text-rose-600 dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{signingOut ? "..." : "Sign Out"}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:border-indigo-400/60 hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:brightness-110 text-white shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0"
              >
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white p-2 rounded-lg border border-slate-200 dark:border-indigo-500/30 bg-white/90 dark:bg-slate-900/70"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-indigo-500/20 bg-white dark:bg-[#070a17] px-6 py-4 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-violet-100 to-cyan-100 dark:from-violet-600/25 dark:to-cyan-600/20 text-slate-950 dark:text-white border border-violet-300 dark:border-cyan-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {userId ? (
            <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
              <Link
                href="/studio/tts"
                onClick={() => setIsOpen(false)}
                className="w-full text-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white"
              >
                Open Studio
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          ) : (
            <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-center px-4 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="text-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}