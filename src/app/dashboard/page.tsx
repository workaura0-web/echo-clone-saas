"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  auth,
  ensureUserProfile,
  logOut,
  subscribeUserProfile,
  UserProfile,
} from "@/lib/firebase/auth";
import {
  AppNotification,
  markAllNotificationsRead,
  markNotificationRead,
  subscribePricingPlans,
  subscribeUserNotifications,
  syncUserLifecycleNotifications,
} from "@/lib/firebase/db";
import { computePackageStatus, getPlanDefinition, PLANS, PlanDefinition, PlanId } from "@/lib/plans";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  CreditCard,
  LogOut,
  Music,
  Plus,
  ShieldCheck,
  User as UserIcon,
  Zap,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [livePlansMap, setLivePlansMap] = useState<Record<PlanId, PlanDefinition>>(PLANS);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get("notice") === "approval") {
      setApprovalNotice(true);
      router.replace("/dashboard");
    }
  }, [router, searchParams]);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;
    const unsubPlans = subscribePricingPlans((mergedMap) => {
      setLivePlansMap(mergedMap);
    });

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(currentUser);
      try {
        const prof = await ensureUserProfile(currentUser);
        setProfile(prof);
        await syncUserLifecycleNotifications(prof);

        unsubProfile = subscribeUserProfile(currentUser, (updated) => {
          setProfile(updated);
          syncUserLifecycleNotifications(updated);
        });

        unsubNotifs = subscribeUserNotifications(currentUser.uid, (items) => {
          setNotifications(items);
        });
      } catch (err) {
        console.error("Failed to load dashboard profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubPlans();
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubNotifs) unsubNotifs();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading account & package metrics...</span>
        </div>
      </div>
    );
  }

  const planDef = getPlanDefinition(profile?.plan, livePlansMap);
  const pkgStatus = computePackageStatus(profile);
  const totalCharacters = profile?.characterLimit || planDef.characterLimit;
  const usedCharacters = profile?.usedCharacters || 0;
  const expiryDateStr = profile?.planExpiresAt
    ? new Date(profile.planExpiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "30 days";

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {approvalNotice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Your account is verified and ready to use.
          </div>
        )}

        {/* Expired / Exhausted Warning Banner */}
        {(pkgStatus.isExpired || pkgStatus.isQuotaExhausted || pkgStatus.isExpiringSoon || pkgStatus.isQuotaLow) && !profile?.isAdmin && (
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              pkgStatus.isExpired || pkgStatus.isQuotaExhausted
                ? "border-rose-500/50 bg-rose-950/30 text-rose-100"
                : "border-amber-500/40 bg-amber-950/20 text-amber-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  pkgStatus.isExpired || pkgStatus.isQuotaExhausted
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-bold">
                  {pkgStatus.isExpired
                    ? `${planDef.name} Package Expired`
                    : pkgStatus.isQuotaExhausted
                    ? "Monthly Character Quota Exhausted"
                    : pkgStatus.isExpiringSoon
                    ? `Package Expiring in ${pkgStatus.daysRemaining} Day${pkgStatus.daysRemaining === 1 ? "" : "s"}`
                    : `Low Character Balance (${pkgStatus.usagePercent}% Used)`}
                </p>
                <p className="text-xs opacity-80">
                  {pkgStatus.blockReason ||
                    `You have ${pkgStatus.remainingCharacters.toLocaleString()} characters remaining until ${expiryDateStr}.`}
                </p>
              </div>
            </div>

            <Link
              href={`/checkout?plan=${profile?.plan === "free" ? "pro" : profile?.plan || "pro"}`}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              Renew / Upgrade Package
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Account & Package Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Monitor your subscription tier, remaining character quota, and expiry notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/studio/tts"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Open Studio
            </Link>
            <Link
              href="/library"
              className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Music className="w-3.5 h-3.5" /> Library
            </Link>
            <Link
              href="/checkout?plan=pro"
              className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Packages
            </Link>
            {profile?.isAdmin && (
              <Link
                href="/admin/payment"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-rose-500/40 hover:text-rose-300 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Account Identity Bar */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-[#121836]/90 via-[#0e1329]/95 to-cyan-950/35 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-white font-bold text-lg">
                {profile?.displayName?.[0]?.toUpperCase() || <UserIcon className="w-6 h-6 text-cyan-300" />}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <h2 className="font-bold text-white">
                  {user?.displayName || profile?.displayName || "Creator"}
                </h2>
                <span className="text-slate-500">·</span>
                <span
                  className={`text-xs font-semibold ${
                    pkgStatus.isExpired || profile?.isApproved === false
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {profile?.isAdmin
                    ? "Administrator"
                    : pkgStatus.isExpired
                    ? "Package Expired"
                    : "Active Account"}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-slate-400">Current Package</p>
              <p className="font-bold text-cyan-300 mt-0.5">{planDef.name}</p>
            </div>
            <div className="border-l border-indigo-500/25 pl-6">
              <p className="text-slate-400">Valid Until</p>
              <p className="font-mono tabular-nums font-semibold text-white mt-0.5">
                {profile?.isAdmin ? "Unlimited" : expiryDateStr}
              </p>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/40 via-[#0d1328] to-[#0a0f20] p-5 space-y-2 shadow-lg shadow-emerald-950/15">
            <div className="flex items-center justify-between text-xs text-emerald-200/80">
              <span>Remaining Characters</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-300 font-mono tabular-nums">
              {pkgStatus.remainingCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              of {totalCharacters.toLocaleString()} monthly limit
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/35 bg-gradient-to-br from-sky-950/40 via-[#0d1328] to-[#0a0f20] p-5 space-y-2 shadow-lg shadow-sky-950/15">
            <div className="flex items-center justify-between text-xs text-sky-200/80">
              <span>Characters Used</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-3xl font-extrabold text-sky-300 font-mono tabular-nums">
              {usedCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              {pkgStatus.usagePercent}% of current cycle consumed
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-950/45 via-[#0d1328] to-[#0a0f20] p-5 space-y-2 shadow-lg shadow-violet-950/15">
            <div className="flex items-center justify-between text-xs text-violet-200/80">
              <span>Package Validity</span>
              <Calendar className="w-4 h-4 text-fuchsia-400" />
            </div>
            <p className="text-3xl font-extrabold text-fuchsia-300 font-mono tabular-nums">
              {profile?.isAdmin ? "∞" : `${pkgStatus.daysRemaining}d`}
            </p>
            <p className="text-xs text-slate-400">
              {profile?.isAdmin
                ? "Full platform access"
                : pkgStatus.isExpired
                ? "Expired — renewal required"
                : `Expires on ${expiryDateStr}`}
            </p>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="rounded-2xl border border-indigo-500/30 bg-[#0d1226]/90 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Monthly Character Quota</span>
            <span className="font-mono tabular-nums text-cyan-300 font-semibold">
              {pkgStatus.usagePercent}% Used
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-indigo-500/25">
            <div
              className={`h-full transition-all duration-300 ${
                pkgStatus.usagePercent >= 90
                  ? "bg-gradient-to-r from-rose-500 to-orange-500"
                  : pkgStatus.usagePercent >= 75
                  ? "bg-gradient-to-r from-amber-500 to-orange-400"
                  : "bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500"
              }`}
              style={{ width: `${pkgStatus.usagePercent}%` }}
            />
          </div>
        </div>

        {/* Bottom 2-Column Split: Package Entitlements + Notifications Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/20 via-[#0d1226] to-[#0a0e1d] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <h3 className="text-sm font-bold text-white">
                Included in {planDef.name}
              </h3>
              <Link
                href="/checkout"
                className="text-xs text-emerald-300 hover:text-emerald-200 font-semibold"
              >
                Change Plan
              </Link>
            </div>
            <ul className="space-y-2.5">
              {planDef.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-950/25 via-[#0d1226] to-[#0a0e1d] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-fuchsia-400" />
                Notifications & Expiry Alerts ({unreadNotifs.length} Unread)
              </h3>
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(notifications)}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No notifications yet. Quota warnings, package expiry alerts, and payment confirmations appear here.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markNotificationRead(n.id)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      n.isRead
                        ? "border-slate-800/70 bg-slate-950/40 text-slate-400"
                        : "border-violet-500/40 bg-slate-800/50 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-white">
                        {n.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}