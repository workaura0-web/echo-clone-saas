"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  auth,
  signupWithEmail,
  signInWithGoogle,
  formatAuthError,
  isUsernameAvailable,
  validateUsername,
} from "@/lib/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

function getSafeRedirectTarget(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/studio/tts";
}

function SignUpFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = getSafeRedirectTarget(searchParams.get("next"));

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable";
    message?: string;
  }>({ state: "idle" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsHighlight, setTermsHighlight] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const termsCheckboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.replace(nextTarget);
      }
    });
    return () => unsub();
  }, [router, nextTarget]);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus({ state: "idle" });
      return;
    }

    const formatCheck = validateUsername(trimmed);
    if (!formatCheck.valid) {
      setUsernameStatus({
        state: "unavailable",
        message: formatCheck.error,
      });
      return;
    }

    setUsernameStatus({ state: "checking", message: "Checking availability..." });
    const timer = setTimeout(async () => {
      try {
        const res = await isUsernameAvailable(trimmed);
        if (res.available) {
          setUsernameStatus({
            state: "available",
            message: `@${res.normalized} is available`,
          });
        } else {
          setUsernameStatus({
            state: "unavailable",
            message: res.error || "Username already taken.",
          });
        }
      } catch {
        setUsernameStatus({ state: "idle" });
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [username]);

  const requireTermsConsent = (): boolean => {
    if (acceptedTerms) return true;
    setTermsHighlight(true);
    setErrorMessage(
      "Please accept the Terms & Conditions and Privacy Policy before creating an account."
    );
    termsCheckboxRef.current?.focus();
    termsCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireTermsConsent()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const check = validateUsername(username);
      if (!check.valid) {
        throw new Error(check.error || "Please choose a valid username.");
      }

      const acceptedAt = new Date().toISOString();
      await signupWithEmail(
        email.trim(),
        password,
        fullName.trim(),
        username,
        acceptedAt
      );
      router.replace(nextTarget);
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Failed to create account"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!requireTermsConsent()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle({ acceptedTermsAt: new Date().toISOString() });
      router.replace(nextTarget);
    } catch (error) {
      setErrorMessage(formatAuthError(error, "Google sign-in cancelled or failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const loginHref =
    nextTarget !== "/studio/tts"
      ? `/login?next=${encodeURIComponent(nextTarget)}`
      : "/login";

  return (
    <div className="min-h-screen text-slate-900 dark:text-white flex flex-col justify-between items-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-[-12%] left-[-10%] w-[440px] h-[440px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[440px] h-[440px] bg-cyan-400/15 dark:bg-cyan-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="pt-2 z-10">
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

      {/* Main Container */}
      <div className="w-full max-w-md my-6 bg-white/95 dark:bg-[#0d1226]/85 border border-indigo-200 dark:border-indigo-500/30 rounded-3xl p-7 sm:p-8 shadow-xl dark:shadow-2xl shadow-indigo-950/10 dark:shadow-violet-950/40 backdrop-blur-xl space-y-5 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl mx-auto p-[1.5px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-violet-500/25">
            <Image
              src="/echo-icon-192.png"
              alt="Echo Clone Emblem"
              width={44}
              height={44}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-[14px] object-cover block bg-slate-950"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 dark:from-pink-400 dark:via-purple-300 dark:to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Unlock Voice Studio & start with 10,000 free characters
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-center text-xs text-rose-700 dark:text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleSignUp}
          type="button"
          disabled={isLoading}
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

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-[#0d1226] px-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            or register with username
          </span>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-3.5">
          {/* Full Name Input */}
          <div className="space-y-1">
            <label htmlFor="signup-name" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-name"
                type="text"
                required
                placeholder="Adeel Malik"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="signup-username"
                className="text-xs text-slate-700 dark:text-slate-300 font-semibold"
              >
                Username (for Sign In)
              </label>
              {usernameStatus.state !== "idle" && (
                <span
                  className={`text-[11px] font-medium ${
                    usernameStatus.state === "available"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : usernameStatus.state === "checking"
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {usernameStatus.message}
                </span>
              )}
            </div>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-username"
                type="text"
                required
                autoComplete="username"
                placeholder="adeel_studio"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                }
                maxLength={24}
                className="w-full bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              3–24 letters, numbers, or underscores. Sign in later with @username or email.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label htmlFor="signup-email" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label
              htmlFor="signup-password"
              className="text-xs text-slate-700 dark:text-slate-300 font-semibold"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/75 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition-all"
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

          {/* Mandatory Terms & Conditions + Privacy Policy Checkbox */}
          <div
            className={`rounded-xl border p-3.5 transition-all ${
              termsHighlight && !acceptedTerms
                ? "border-rose-400 bg-rose-50 dark:border-rose-400/80 dark:bg-rose-950/25 shadow-sm shadow-rose-500/20"
                : acceptedTerms
                ? "border-emerald-400 dark:border-emerald-500/45 bg-emerald-50 dark:bg-emerald-950/15"
                : "border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60"
            }`}
          >
            <label
              htmlFor="signup-accept-terms"
              className="flex items-start gap-2.5 cursor-pointer select-none"
            >
              <input
                ref={termsCheckboxRef}
                id="signup-accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAcceptedTerms(checked);
                  if (checked) {
                    setTermsHighlight(false);
                    setErrorMessage((prev) =>
                      prev && prev.includes("Terms & Conditions") ? null : prev
                    );
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-white/25 bg-white dark:bg-slate-900 accent-cyan-500 dark:accent-cyan-400 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                I accept the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-semibold underline underline-offset-2"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-700 dark:text-violet-300 hover:text-violet-600 dark:hover:text-violet-200 font-semibold underline underline-offset-2"
                >
                  Privacy Policy
                </Link>{" "}
                of Echo Clone Studio.
              </span>
            </label>
            {!acceptedTerms && (
              <p className="mt-1.5 pl-6 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Required for both Email and Google account registration</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || usernameStatus.state === "unavailable" || !acceptedTerms}
            className="w-full py-3 mt-1 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="border-t border-slate-200 dark:border-white/10 pt-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Sign in anytime with Google, @username, or email</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Instant access to Story Emotion & Multi-Accent Studio</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-1">
          Already have an account?{" "}
          <Link href={loginHref} className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-200 font-semibold">
            Sign In
          </Link>
        </p>
      </div>

      <div className="pb-2 z-10">
        <p className="text-[11px] text-slate-500 font-medium tracking-wide">
          Developed by <span className="text-slate-700 dark:text-slate-300 font-semibold">ABM CodeSpace</span>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs">
          Loading registration...
        </div>
      }
    >
      <SignUpFormContent />
    </Suspense>
  );
}