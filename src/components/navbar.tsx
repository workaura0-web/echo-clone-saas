"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  auth,
  ensureUserProfile,
  isAdminEmail,
  subscribeUserProfile,
  UserProfile,
} from "@/lib/firebase/auth";
import {
  AppNotification,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeUserNotifications,
  syncUserLifecycleNotifications,
} from "@/lib/firebase/db";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (user) {
        setUserId(user.uid);
        setIsAdmin(isAdminEmail(user.email));
        const initialProf = await ensureUserProfile(user);
        setProfile(initialProf);
        await syncUserLifecycleNotifications(initialProf);

        unsubProfile = subscribeUserProfile(user, (updatedProf) => {
          setProfile(updatedProf);
          syncUserLifecycleNotifications(updatedProf);
        });

        unsubNotifs = subscribeUserNotifications(user.uid, (items) => {
          setNotifications(items);
        });
      } else {
        setUserId(null);
        setIsAdmin(false);
        setProfile(null);
        setNotifications([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

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

  const baseLinks = [
    { name: "Home", href: "/" },
    { name: "Studio", href: "/studio/tts" },
    { name: "Library", href: "/library" },
    { name: "Packages", href: "/checkout" },
    { name: "Dashboard", href: "/dashboard" },
  ];

  const navLinks = isAdmin
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-8 px-6">
        {/* Zone 1: Single-element Brand Wordmark */}
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-violet-300 transition-colors"
        >
          Echo Clone
        </Link>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
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
                    ? "text-white border-violet-500"
                    : "border-transparent hover:text-slate-100"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Notification Bell + Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {userId && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <span className="text-xs font-semibold text-white">
                      Account Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead(notifications)}
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        You are all caught up. Package expiry and quota alerts appear here.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex items-start gap-3 ${
                            !n.isRead ? "bg-slate-800/30" : ""
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
                              <p className="text-xs font-semibold text-slate-100 truncate">
                                {n.title}
                              </p>
                              {!n.isRead && (
                                <span className="text-[10px] text-violet-400 font-semibold shrink-0">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {profile && (
                    <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Plan: {profile.planName}</span>
                      <Link
                        href="/dashboard"
                        onClick={() => setNotifOpen(false)}
                        className="text-violet-400 hover:text-violet-300 font-medium"
                      >
                        Manage Plan
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Link
            href={userId ? "/studio/tts" : "/login"}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <span>{userId ? "Open Studio" : "Sign In"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg border border-slate-800 bg-slate-900/60"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col gap-2">
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
                    ? "bg-violet-600/20 text-white border border-violet-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <Link
            href={userId ? "/studio/tts" : "/login"}
            onClick={() => setIsOpen(false)}
            className="mt-2 w-full text-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-violet-600 text-white"
          >
            {userId ? "Open Studio" : "Sign In"}
          </Link>
        </div>
      )}
    </header>
  );
}