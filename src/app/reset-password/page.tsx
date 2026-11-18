"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, formatAuthError, resetPassword } from "@/lib/firebase/auth";
import { onAuthStateChanged, updatePassword, User } from "firebase/auth";
import { ArrowLeft, AtSign, Eye, EyeOff, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!auth.currentUser) {
      setError("Please sign in first or request a password reset email below.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      setMessage("Password updated successfully. Redirecting to dashboard...");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (updateError) {
      setError(formatAuthError(updateError, "Failed to update password"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!identifier.trim()) {
      setError("Enter your username or registered email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(identifier.trim());
      setMessage("Password reset instructions sent to your email inbox.");
    } catch (err) {
      setError(formatAuthError(err, "Could not send password reset email."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-12%] left-[-10%] w-[420px] h-[420px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-12%] right-[-10%] w-[420px] h-[420px] bg-cyan-400/15 dark:bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md space-y-5 rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-white/95 dark:bg-[#0d1226]/85 backdrop-blur-xl p-7 sm:p-8 shadow-xl dark:shadow-2xl shadow-indigo-950/10 dark:shadow-violet-950/40 relative z-10">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto p-[1.5px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Logo"
              width={44}
              height={44}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-[14px] object-cover bg-slate-950"
            />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 dark:from-pink-400 dark:via-purple-300 dark:to-cyan-400 bg-clip-text text-transparent">
            {authReady && user ? "Set New Password" : "Reset Password"}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {authReady && user
              ? "Choose a strong new password for your signed-in account."
              : "Enter your username or email address to receive a password reset link."}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-500/30 text-center"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30 text-center"
          >
            {message}
          </p>
        )}

        {!authReady ? (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : user ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/75 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/75 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 px-4 py-2.5 font-bold text-sm text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/20"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="your_username or name@example.com"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/75 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 px-4 py-2.5 font-bold text-sm text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/20"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-200 dark:border-white/10">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {user ? "Back to Dashboard" : "Back to Sign In"}
          </Link>
        </div>
      </div>
    </main>
  );
}
