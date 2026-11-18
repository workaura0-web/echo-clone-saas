"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  auth,
  loginWithEmailOrUsername,
  signInWithGoogle,
  resetPassword,
  formatAuthError,
} from "@/lib/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, AtSign, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

function getSafeRedirectTarget(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/studio/tts";
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = getSafeRedirectTarget(searchParams.get("next"));
  const isGateRedirect = searchParams.get("reason") === "studio_auth";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.replace(nextTarget);
      }
    });
    return () => unsub();
  }, [router, nextTarget]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      await loginWithEmailOrUsername(identifier.trim(), password);
      router.replace(nextTarget);
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Failed to sign in"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      await signInWithGoogle();
      router.replace(nextTarget);
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Google sign-in cancelled or failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalized = identifier.trim();
    if (!normalized) {
      setErrorMessage("Enter your username or email address first.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      await resetPassword(normalized);
      setNotice("Password reset link sent to your registered email inbox.");
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Could not send reset email"));
    } finally {
      setLoading(false);
    }
  };

  const signupHref =
    nextTarget !== "/studio/tts"
      ? `/signup?next=${encodeURIComponent(nextTarget)}`
      : "/signup";

  return (
    <div className="min-h-screen text-slate-900 dark:text-white relative flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden font-sans">
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 dark:bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Link */}
      <div className="pt-4 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 text-xs text-slate-800 dark:text-slate-200 backdrop-blur-md hover:border-cyan-500/60 transition-colors shadow-sm"
        >
          <Image
            src="/echo-icon-192.png"
            alt="Echo Clone Logo"
            width={20}
            height={20}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded object-cover"
          />
          <span className="font-semibold">Echo Clone Studio</span>
        </Link>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md my-6 relative z-10 space-y-6 bg-white/95 dark:bg-[#0d1226]/85 backdrop-blur-xl p-7 sm:p-8 rounded-3xl border border-indigo-200 dark:border-indigo-500/30 shadow-xl dark:shadow-2xl shadow-indigo-950/10 dark:shadow-violet-950/40">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl mx-auto p-[2px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/25">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Emblem"
              width={52}
              height={52}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-[14px] object-cover bg-slate-950"
            />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 dark:from-pink-400 dark:via-purple-300 dark:to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sign in with Google, your @username, or email to access Voice Studio
          </p>
        </div>

        {isGateRedirect && !errorMessage && (
          <div className="rounded-xl border border-cyan-300 dark:border-cyan-500/35 bg-cyan-50 dark:bg-cyan-950/30 px-3.5 py-2.5 text-xs text-cyan-800 dark:text-cyan-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>Create an account or sign in to unlock Studio Text-to-Speech.</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-center text-xs text-rose-700 dark:text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-center text-xs text-emerald-700 dark:text-emerald-200"
          >
            {notice}
          </div>
        )}

        {/* Google One-Click Sign In */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10 text-sm font-semibold flex items-center justify-center gap-3 transition-all text-slate-900 dark:text-slate-100 disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-[#0d1226] px-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            or username / email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username or Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-identifier"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Username or Email
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="your_username or name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-medium disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-1 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-white/10">
          Don&apos;t have an account?{" "}
          <Link
            href={signupHref}
            className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-semibold transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Subtle Company Credit */}
      <div className="pb-2 z-10">
        <p className="text-[11px] text-slate-500 font-medium tracking-wide">
          Developed by <span className="text-slate-700 dark:text-slate-300 font-semibold">ABM CodeSpace</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs">
          Loading sign-in...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}