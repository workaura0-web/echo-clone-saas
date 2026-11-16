"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginWithEmail, signInWithGoogle, resetPassword } from "@/lib/firebase/auth";
import { Sparkles, Mail, Lock, ArrowRight, Heart, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      await loginWithEmail(email.trim(), password);
      router.replace("/studio/tts");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to sign in";
      if (msg.includes("operation-not-allowed")) {
        setErrorMessage("Email/password sign-in is disabled on this project. Please use Continue with Google.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      router.replace("/studio/tts");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in cancelled or failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email address first.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      await resetPassword(normalizedEmail);
      setNotice("Password reset email sent. Check your inbox.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden font-sans">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Spacer / Header Brand */}
      <div className="pt-4 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs text-slate-300 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Echo Voice Platform
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md my-auto relative z-10 space-y-6 bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl shadow-purple-500/5">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to your Echo Studio account
          </p>
        </div>

        {errorMessage && (
          <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-200">
            {notice}
          </div>
        )}

        {/* Google One-Click Sign In */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-sm font-semibold flex items-center justify-center gap-3 transition-all text-slate-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold absolute">
            or email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500/80 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500/80 transition-all"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} title={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
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
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
            Sign Up
          </Link>
        </div>
      </div>

      {/* Creator Credit Footer */}
      <div className="pb-2 z-10">
        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium tracking-wide">
          made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
        </p>
      </div>

    </div>
  );
}