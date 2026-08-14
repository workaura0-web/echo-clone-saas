"use client";

import { useEffect, useState } from "react";
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
  Phone
} from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "pro";

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NayaPay Account Details (Apni details yahan replace karein)
  const NAYAPAY_DETAILS = {
    accountTitle: "ABM Echo Clone",
    nayapayNumber: "03001234567",
    nayapayId: "abm@nayapay"
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      alert("Payment details submitted! Your account will be upgraded within 1-2 hours after verification.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8 relative z-10">
        
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            Upgrade Plan & Payment
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">Complete your payment using NayaPay to activate your plan.</p>
        </div>

        {/* User Account Summary */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/10 space-y-2">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Account Details
          </h2>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>User Email:</span>
            <span className="font-semibold text-slate-200">{loading ? "Loading..." : (userEmail || "Not Logged In")}</span>
          </div>
        </div>

        {/* Selected Plan Details */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-purple-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <h2 className="text-base font-bold text-slate-100">{currentPlan.name}</h2>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-purple-400 block">{currentPlan.pricePkr}</span>
              <span className="text-[10px] text-slate-400">({currentPlan.priceUsd})</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Included Features:</p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentPlan.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* NayaPay Payment Details */}
        <div className="bg-gradient-to-br from-orange-950/30 to-slate-950/80 p-5 rounded-2xl border border-orange-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              <h2 className="text-sm font-bold text-orange-200">NayaPay Payment Details</h2>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Instant Transfer
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block">Account Title:</span>
              <span className="font-bold text-slate-200 text-sm">{NAYAPAY_DETAILS.accountTitle}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block flex items-center gap-1">
                <Phone className="w-3 h-3 text-orange-400" /> NayaPay Mobile / Account Number:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-300 text-sm tracking-wider">{NAYAPAY_DETAILS.nayapayNumber}</span>
                <button 
                  onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayNumber)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy Number"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-white/5">
            📌 <strong className="text-slate-200">Instructions:</strong> Open your NayaPay or any banking app, send <strong>{currentPlan.pricePkr}</strong> to the number above, and enter the Transaction Reference ID below.
          </p>
        </div>

        {/* Transaction Reference Submission Form */}
        <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Enter Transaction Reference ID (TRX / Ref No.)
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 982347102934"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-orange-500 via-purple-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] text-white text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Submitting Payment..." : "Confirm & Submit Payment"}
          </button>
        </form>

      </div>
    </div>
  );
}