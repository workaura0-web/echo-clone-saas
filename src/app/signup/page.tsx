"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signupWithEmail, signInWithGoogle, formatAuthError } from "@/lib/firebase/auth";
import { ArrowRight, Lock, Mail, User, CheckCircle2, Eye, EyeOff, MessageCircle } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signupWithEmail(email.trim(), password, fullName);
      router.replace("/studio/tts");
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Failed to create account"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      router.replace("/studio/tts");
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Google sign-in cancelled or failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-[-12%] left-[-10%] w-[420px] h-[420px] bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[420px] h-[420px] bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/70 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 backdrop-blur-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white mb-2">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Logo"
              width={36}
              height={36}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl border border-violet-500/40 object-cover shadow-md shadow-violet-500/20"
            />
            <span className="text-slate-100">Echo Clone</span>
          </Link>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-slate-400">Start with 10,000 characters free for 30 days</p>
        </div>

        {errorMessage && (
          <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleSignUp}
          type="button"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-sm font-semibold flex items-center justify-center gap-3 transition-all"
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

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold absolute">
            or email
          </span>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/80 transition-all"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/80 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/80 transition-all"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} title={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Perks Checklist */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero API keys required</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Instant access to Story Emotion & Multi-Accent Studio</span>
          </div>
        </div>

        {/* Footer Link */}
        <div className="flex items-center justify-center pt-1">
          <a href="https://wa.me/923253229649?text=Hello%20ABM%2C%20I%20need%20help%20with%20Echo%20Studio" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20" title="Contact ABM on WhatsApp">
            <MessageCircle className="h-4 w-4" /> Contact (ABM)
          </a>
        </div>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline font-semibold">
            Log In
          </Link>
        </p>

      </div>
    </div>
  );
}