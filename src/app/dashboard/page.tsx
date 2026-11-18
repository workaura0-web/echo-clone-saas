"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  changeUserPassword,
  claimUsernameForUser,
  formatAuthError,
  hasPasswordProvider,
  logOut,
} from "@/lib/firebase/auth";
import {
  GenerationRecord,
  getUserGenerations,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/firebase/db";
import { useAppState } from "@/components/app-state-provider";
import UserAvatar from "@/components/user-avatar";
import { computePackageStatus, getPlanDefinition } from "@/lib/plans";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  AtSign,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mic,
  Music,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authReady, profile, livePlansMap, notifications } = useAppState();
  const [recentClips, setRecentClips] = useState<GenerationRecord[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState(false);

  // Username Claim State (only displayed if unset)
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("notice") === "approval") {
      setApprovalNotice(true);
      router.replace("/dashboard");
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login?next=/dashboard");
      return;
    }

    let cancelled = false;
    getUserGenerations(user.uid)
      .then((items) => {
        if (!cancelled) setRecentClips(items.slice(0, 4));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [authReady, user, router]);

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

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile?.username) return;
    setSavingUsername(true);
    setUsernameFeedback(null);
    try {
      const saved = await claimUsernameForUser(user, usernameInput);
      setUsernameInput(saved);
      setEditingUsername(false);
      setUsernameFeedback({
        type: "success",
        text: `Username @${saved} is now active on your account.`,
      });
    } catch (err) {
      setUsernameFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Could not save username.",
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordFeedback(null);

    const usesPassword = hasPasswordProvider(user);
    if (usesPassword && !currentPassword) {
      setPasswordFeedback({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        text: "New password and re-entered password do not match.",
      });
      return;
    }
    if (usesPassword && currentPassword === newPassword) {
      setPasswordFeedback({
        type: "error",
        text: "New password must be different from your current password.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changeUserPassword(user, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        text:
          res.mode === "linked"
            ? "Account password set successfully. You can now sign in with your @username or email and password."
            : "Password updated successfully.",
      });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        text: formatAuthError(err, "Could not update password. Please try again."),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading account & package metrics...</span>
        </div>
      </div>
    );
  }

  const usesPasswordProvider = hasPasswordProvider(user);

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
    <div className="min-h-screen text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {approvalNotice && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Your account is verified and ready to use.
          </div>
        )}

        {/* Expired / Exhausted Warning Banner */}
        {(pkgStatus.isExpired ||
          pkgStatus.isQuotaExhausted ||
          pkgStatus.isExpiringSoon ||
          pkgStatus.isQuotaLow) &&
          !profile?.isAdmin && (
            <div
              className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                pkgStatus.isExpired || pkgStatus.isQuotaExhausted
                  ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100"
                  : "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    pkgStatus.isExpired || pkgStatus.isQuotaExhausted
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">
                    {pkgStatus.isExpired
                      ? `${planDef.name} Package Expired`
                      : pkgStatus.isQuotaExhausted
                      ? "Monthly Character Quota Exhausted"
                      : pkgStatus.isExpiringSoon
                      ? `Package Expiring in ${pkgStatus.daysRemaining} Day${
                          pkgStatus.daysRemaining === 1 ? "" : "s"
                        }`
                      : `Low Character Balance (${pkgStatus.usagePercent}% Used)`}
                  </p>
                  <p className="text-xs opacity-90">
                    {pkgStatus.blockReason ||
                      `You have ${pkgStatus.remainingCharacters.toLocaleString()} characters remaining until ${expiryDateStr}.`}
                  </p>
                </div>
              </div>

              <Link
                href={`/checkout?plan=${
                  profile?.plan === "free" ? "pro" : profile?.plan || "pro"
                }`}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
              >
                Renew / Upgrade Package
              </Link>
            </div>
          )}

        {/* Top Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-200 dark:border-indigo-500/20 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Account Dashboard
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Manage your @username sign-in handle, active credits, and voice studio activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/studio/tts"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-600/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Open Studio
            </Link>
            <Link
              href="/library"
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm dark:shadow-none"
            >
              <Music className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Library
            </Link>
            <Link
              href="/checkout?plan=pro"
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm dark:shadow-none"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Packages
            </Link>
            {profile?.isAdmin && (
              <Link
                href="/admin/payment"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Account Identity & Username Handle Card */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-white via-indigo-50/40 to-cyan-50/60 dark:from-[#121836]/90 dark:via-[#0e1329]/95 dark:to-cyan-950/35 p-5 sm:p-6 space-y-4 shadow-md dark:shadow-lg shadow-indigo-950/5 dark:shadow-indigo-950/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                photoURL={profile?.photoURL || user?.photoURL}
                displayName={user?.displayName || profile?.displayName}
                sizeClass="w-12 h-12"
                textClass="text-lg"
                roundedClass="rounded-xl"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    {user?.displayName || profile?.displayName || "Creator"}
                  </h2>
                  {profile?.username && (
                    <span className="px-2 py-0.5 rounded-md border border-cyan-300 dark:border-cyan-500/35 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 font-mono text-[11px]">
                      @{profile.username}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      pkgStatus.isExpired || profile?.isApproved === false
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {profile?.isAdmin
                      ? "· Administrator"
                      : pkgStatus.isExpired
                      ? "· Package Expired"
                      : "· Active Studio Access"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Current Package</p>
                <p className="font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">{planDef.name}</p>
              </div>
              <div className="border-l border-indigo-200 dark:border-indigo-500/25 pl-5">
                <p className="text-slate-500 dark:text-slate-400">Valid Until</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white mt-0.5">
                  {profile?.isAdmin ? "Unlimited" : expiryDateStr}
                </p>
              </div>
              {profile && !profile.username && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUsername((prev) => !prev);
                    setUsernameInput("");
                    setUsernameFeedback(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-400/35 bg-white dark:bg-slate-950/70 hover:border-cyan-500/60 text-xs font-semibold text-cyan-700 dark:text-cyan-200 transition-colors shadow-sm dark:shadow-none"
                >
                  Set @username
                </button>
              )}
            </div>
          </div>

          {usernameFeedback && (
            <div
              className={`rounded-xl border px-3.5 py-2 text-xs ${
                usernameFeedback.type === "error"
                  ? "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200"
                  : "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200"
              }`}
            >
              {usernameFeedback.text}
            </div>
          )}

          {editingUsername && !profile?.username && (
            <form
              onSubmit={handleSaveUsername}
              className="pt-3 border-t border-indigo-200 dark:border-indigo-500/20 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="relative flex-1">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={usernameInput}
                  onChange={(e) =>
                    setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                  }
                  placeholder="choose_your_username"
                  className="w-full rounded-xl border border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={savingUsername}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:brightness-110 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {savingUsername ? "Saving..." : "Save Handle"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUsername(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/35 bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-2 shadow-sm dark:shadow-lg shadow-emerald-950/5 dark:shadow-emerald-950/15">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-200/80">
              <span>Remaining Characters</span>
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
              {pkgStatus.remainingCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              of {totalCharacters.toLocaleString()} monthly limit
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 dark:border-sky-500/35 bg-gradient-to-br from-sky-50 via-white to-slate-50 dark:from-sky-950/40 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-2 shadow-sm dark:shadow-lg shadow-sky-950/5 dark:shadow-sky-950/15">
            <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-200/80">
              <span>Characters Used</span>
              <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-3xl font-extrabold text-sky-700 dark:text-sky-300 font-mono tabular-nums">
              {usedCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pkgStatus.usagePercent}% of current cycle consumed
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 dark:border-violet-500/35 bg-gradient-to-br from-violet-50 via-white to-slate-50 dark:from-violet-950/45 dark:via-[#0d1328] dark:to-[#0a0f20] p-5 space-y-2 shadow-sm dark:shadow-lg shadow-violet-950/5 dark:shadow-violet-950/15">
            <div className="flex items-center justify-between text-xs text-violet-700 dark:text-violet-200/80">
              <span>Package Validity</span>
              <Calendar className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <p className="text-3xl font-extrabold text-fuchsia-700 dark:text-fuchsia-300 font-mono tabular-nums">
              {profile?.isAdmin ? "∞" : `${pkgStatus.daysRemaining}d`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile?.isAdmin
                ? "Full platform access"
                : pkgStatus.isExpired
                ? "Expired — renewal required"
                : `Expires on ${expiryDateStr}`}
            </p>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/90 dark:bg-[#0d1226]/90 p-5 space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Monthly Character Quota</span>
            <span className="font-mono tabular-nums text-cyan-700 dark:text-cyan-300 font-semibold">
              {pkgStatus.usagePercent}% Used
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-indigo-200 dark:border-indigo-500/25">
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

        {/* Recent Studio Generations Strip */}
        <div className="rounded-2xl border border-cyan-200 dark:border-cyan-500/25 bg-gradient-to-b from-cyan-50/70 via-white to-slate-50 dark:from-cyan-950/20 dark:via-[#0d1226] dark:to-[#0a0e1d] p-5 space-y-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-500/20 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Recent Voice Studio Generations
            </h3>
            <Link
              href="/library"
              className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-semibold inline-flex items-center gap-1"
            >
              View Full Library <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentClips.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No generated clips yet. Open Voice Studio to create your first neural MP3.
              </p>
              <Link
                href="/studio/tts"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-xs font-semibold text-white"
              >
                Launch Voice Studio <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentClips.map((clip) => (
                <Link
                  key={clip.id}
                  href="/library"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-cyan-500/60 transition-colors space-y-1.5 shadow-sm dark:shadow-none"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{clip.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {clip.voiceName} · {clip.accentLabel}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                    {clip.characterCount.toLocaleString()} chars · {clip.durationSeconds}s
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 2-Column Split: Package Entitlements + Notifications Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/20 dark:via-[#0d1226] dark:to-[#0a0e1d] p-5 space-y-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-500/20 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Included in {planDef.name}
              </h3>
              <Link
                href="/checkout"
                className="text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 font-semibold"
              >
                Change Plan
              </Link>
            </div>
            <ul className="space-y-2.5">
              {planDef.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-violet-200 dark:border-violet-500/25 bg-gradient-to-b from-violet-50/70 via-white to-slate-50 dark:from-violet-950/25 dark:via-[#0d1226] dark:to-[#0a0e1d] p-5 space-y-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between border-b border-violet-200 dark:border-violet-500/20 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                Notifications & Expiry Alerts ({unreadNotifs.length} Unread)
              </h3>
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(notifications)}
                  className="text-xs text-violet-700 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                  No notifications yet. Quota warnings, package expiry alerts, and payment confirmations appear here.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markNotificationRead(n.id)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      n.isRead
                        ? "border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400"
                        : "border-violet-300 dark:border-violet-500/40 bg-violet-50/70 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
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
        {/* Account Security & Change Password Section */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-white via-indigo-50/35 to-violet-50/40 dark:from-[#101633]/95 dark:via-[#0d1226] dark:to-[#120e28]/90 p-5 sm:p-6 space-y-4 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200 dark:border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-400/30 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {usesPasswordProvider ? "Change Account Password" : "Set Account Password"}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {usesPasswordProvider
                    ? "Verify your current password and enter a new password for your account."
                    : "Create a password so you can also sign in directly with your @username or email."}
                </p>
              </div>
            </div>
          </div>

          {passwordFeedback && (
            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                passwordFeedback.type === "error"
                  ? "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200"
                  : "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200"
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Current Password{!usesPasswordProvider ? " (Optional for Google)" : ""}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required={usesPasswordProvider}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={usesPasswordProvider ? "Enter current password" : "Not set yet"}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/85 pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 dark:focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/85 pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 dark:focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Re-enter New Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/85 pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500 dark:focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 disabled:opacity-60 text-xs font-bold text-white shadow-md shadow-violet-600/20 inline-flex items-center gap-2 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {savingPassword
                  ? "Updating Password..."
                  : usesPasswordProvider
                  ? "Update Password"
                  : "Save Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs">
          Loading dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}