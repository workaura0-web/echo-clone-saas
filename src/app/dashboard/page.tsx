"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase"; // Path verify kar lein
import type { User } from "@supabase/supabase-js";
import { 
  LogOut, 
  Sparkles, 
  Zap, 
  Activity, 
  CreditCard, 
  User as UserIcon,
  Plus,
  Heart
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{
    total_characters: number;
    used_characters: number;
    plan_name: string | null;
  } | null>(null);
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
    const fetchUserData = async () => {
      // 1. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Agar user login nahi hai to seedha login page par bhej do
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // 2. Fetch profile data from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error) {
        setProfile(data);
      }
      
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  // Working Logout Function
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking authentication & loading dashboard...</span>
        </div>
      </div>
    );
  }

  const totalCharacters = Math.max(10000, profile?.total_characters || 0);
  const usedCharacters = profile?.used_characters || 0;
  const remainingCharacters = Math.max(0, totalCharacters - usedCharacters);

  const usagePercentage = Math.min(100, Math.round((usedCharacters / totalCharacters) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col justify-between overflow-hidden p-4 md:p-8 font-sans">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8">
        {approvalNotice && (
          <div role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            Your account is ready. Please wait for admin approval before using premium features.
          </div>
        )}
        
        {/* Top Bar / Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-pink-400" /> Dashboard Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage your Echo AI voice generation account and limits.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/studio/tts")}
              className="px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98] text-white text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Voice
            </button>

            <button
              onClick={() => router.push("/checkout?plan=pro")}
              className="px-4 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <CreditCard className="w-4 h-4" /> Upgrade Plan
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 border border-white/10 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Profile Card Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-500/40 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  {user?.user_metadata?.full_name || "User Account"}
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          {/* Quick Subscription Badge */}
          <div className="bg-slate-950/60 p-3.5 px-5 rounded-2xl border border-white/5 flex items-center gap-3 self-stretch md:self-auto">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Plan Status</p>
              <p className="text-xs font-bold text-slate-200">{profile?.plan_name || "Free Tier"}</p>
            </div>
          </div>
        </div>

        {/* Package & Limits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Active Plan Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Plan</span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-purple-400">
              {profile?.plan_name || "No Active Plan"}
            </p>
            <p className="text-xs text-slate-500">Upgrade anytime to increase generation limits.</p>
          </div>

          {/* Remaining Characters Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Remaining Characters</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400">
              {remainingCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">
              Out of {totalCharacters.toLocaleString()} total monthly allocation.
            </p>
          </div>

          {/* Used Characters Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Used Characters</span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-200">
              {usedCharacters.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Characters processed during this billing period.</p>
          </div>

        </div>

        {/* Visual Progress Bar Section */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Monthly Usage Progress</span>
            <span className="text-purple-400 font-mono">{usagePercentage}% Used</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

      </div>

      {/* Creator Credit Footer */}
      <footer className="pt-8 pb-2 text-center z-10">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium tracking-wide">
          made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by <span className="text-slate-300 font-bold">ABM</span>
        </p>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}