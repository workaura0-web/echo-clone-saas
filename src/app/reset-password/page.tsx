"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
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

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated. You can now log in.");
      setTimeout(() => router.replace("/login"), 1200);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div>
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a new password for your account.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
        <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 pr-10 text-sm"
        />
        <button type="button" onClick={() => setShowPassword((current) => !current)} title={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          minLength={8}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold disabled:opacity-50">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}
