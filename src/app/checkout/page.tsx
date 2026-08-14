"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase";
import { 
  User, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  ArrowLeft,
  Copy,
  CheckCircle2,
  Phone,
  Building
} from "lucide-react";
import Link from "next/link";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "pro";

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aap ki NayaPay Details
  const NAYAPAY_DETAILS = {
    accountTitle: "Abdullah Meraj",
    nayapayId: "Abdullahmeraj25@nayapay",
    nayapayNumber: "03313429680",
    nayapayIban: "PK38 NAYA1234 5033 1342 9680"
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "User Account");
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const planDetails: Record<string, { name: string; pricePkr: string; priceUsd: string; features: string[] }> = {
    free: {
      name: "Free Plan",
      pricePkr: "PKR 0",
      priceUsd: "$0 / month",
      features: ["10,000 Characters / mo", "Access to Standard Voices", "MP3 Audio Downloads"]
    },
    pro: {
      name: "Pro Plan",
      pricePkr: "PKR 5,300 / month",
      priceUsd: "$19 / month",
      features: ["100,000 Characters / mo", "5 Instant Voice Clones", "High-Quality Audio Export", "Commercial Rights"]
    },
    enterprise: {
      name: "Enterprise Plan",
      pricePkr: "PKR 27,500 / month",
      priceUsd: "$99 / month",
      features: ["Unlimited Characters", "Unlimited Voice Clones", "Dedicated API Access"]
    }
  };

  const currentPlan = planDetails[selectedPlan] || planDetails.pro;

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      alert("Please enter Transaction Reference ID!");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Payment details submitted successfully! Your account will be upgraded after verification.");
    }, 1500);
  };

  return (
    <div className="max-w-3xl w-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(168,85,247,0.15)] space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
      
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent animate-pulse">
          Upgrade Plan & Payment
        </h1>
        <p className="text-slate-400 text-xs md:text-sm">Complete your payment via NayaPay to activate instant access.</p>
      </div>

      {/* User Account Details */}
      <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-2 hover:border-purple-500/30 transition-all">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-400" /> Account Summary
        </h2>
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Logged-in Email:</span>
          <span className="font-semibold text-slate-200">{loading ? "Loading..." : (userEmail || "Guest User")}</span>
        </div>
      </div>

      {/* Plan Details */}
      <div className="bg-slate-950/70 p-5 rounded-2xl border border-purple-500/30 space-y-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h2 className="text-base font-bold text-slate-100">{currentPlan.name}</h2>
          </div>
          <div className="text-right">
            <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">
              {currentPlan.pricePkr}
            </span>
            <span className="text-[10px] text-slate-500">({currentPlan.priceUsd})</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium">Plan Features Included:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
            {currentPlan.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* NayaPay Animated Card with Neon Styling */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-black p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-cyan-200 tracking-wide">NayaPay Payment Account</h2>
          </div>
          <span className="text-[10px] px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold animate-pulse">
            Instant Transfer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Account Title */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[11px]">Account Title</span>
            <span className="font-bold text-slate-100 text-sm">{NAYAPAY_DETAILS.accountTitle}</span>
          </div>

          {/* NayaPay ID */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[11px]">NayaPay ID</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-xs">{NAYAPAY_DETAILS.nayapayId}</span>
              <button 
                onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayId, "id")}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy ID"
              >
                {copiedField === "id" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mobile / Account Number (Neon Green Glow) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/30 space-y-1 md:col-span-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <span className="text-slate-400 block text-[11px] flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" /> Account / Mobile Number
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] tracking-widest">
                {NAYAPAY_DETAILS.nayapayNumber}
              </span>
              <button 
                onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayNumber, "number")}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy Mobile Number"
              >
                {copiedField === "number" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* IBAN (Neon Cyan Glow) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-cyan-500/30 space-y-1 md:col-span-2 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <span className="text-slate-400 block text-[11px] flex items-center gap-1">
              <Building className="w-3 h-3 text-cyan-400" /> NayaPay IBAN
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs md:text-sm font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)] tracking-wider">
                {NAYAPAY_DETAILS.nayapayIban}
              </span>
              <button 
                onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayIban, "iban")}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy IBAN"
              >
                {copiedField === "iban" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

        </div>

        <p className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-white/5 leading-relaxed">
          📌 <strong className="text-slate-200">Instruction:</strong> Transfer <span className="text-emerald-400 font-bold">{currentPlan.pricePkr}</span> to the NayaPay account or IBAN above, then enter the Transaction Reference ID (TRX ID) below.
        </p>
      </div>

      {/* Transaction Submission Form */}
      <form onSubmit={handleSubmitPayment} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Transaction Reference ID (TRX / Ref No.)
          </label>
          <input
            type="text"
            required
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g. 982347102934"
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:scale-[1.01] active:scale-[0.99] text-white text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Verifying Transaction..." : "Submit Payment Reference"}
        </button>
      </form>

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Suspense Wrapper */}
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}