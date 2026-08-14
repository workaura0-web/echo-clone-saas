"use client";

import { useEffect, useState, Suspense } from "react";
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
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Aap ki NayaPay Details
  const NAYAPAY_DETAILS = {
    accountTitle: "Abdullah Meraj",
    nayapayId: "Abdullahmeraj25@nayapay",
    nayapayNumber: "03313429680",
    nayapayIban: "PK38 NAYA1234 5033 1342 9680"
  };

  // Only Pro Plan Configured
  const PRO_PLAN = {
    name: "Pro Plan",
    pricePkr: "PKR 1,300 / month",
    priceUsd: "~$4.70 / month",
    wordLimit: "100,000 Words / mo",
    features: [
      "100,000 Words / month",
      "Access to All Premium Voices",
      "5 Instant Voice Clones",
      "High-Quality Audio Export (MP3/WAV)",
      "Commercial Rights Included"
    ]
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email || "" });
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

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: "error", text: "Please log in to submit payment!" });
      return;
    }

    if (!transactionId.trim()) {
      setMessage({ type: "error", text: "Please enter Transaction Reference ID!" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("payments").insert([
        {
          user_id: user.id,
          user_email: user.email,
          plan_name: PRO_PLAN.name,
          price_pkr: PRO_PLAN.pricePkr,
          transaction_id: transactionId.trim(),
          status: "pending"
        }
      ]);

      if (error) {
        if (error.code === "23505") {
          throw new Error("This Transaction Reference ID has already been submitted!");
        }
        throw error;
      }

      setMessage({ 
        type: "success", 
        text: "Payment details submitted successfully! Your Pro Plan will be activated as soon as admin approves the transaction." 
      });
      setTransactionId("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit transaction." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl w-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(168,85,247,0.15)] space-y-8 relative z-10">
      
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
          Upgrade to Pro Plan
        </h1>
        <p className="text-slate-400 text-xs md:text-sm">Transfer amount via NayaPay and submit your transaction ID for verification.</p>
      </div>

      {/* Account Info */}
      <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-2">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-400" /> Account Summary
        </h2>
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Logged-in Email:</span>
          <span className="font-semibold text-slate-200">{loading ? "Loading..." : (user?.email || "Guest User")}</span>
        </div>
      </div>

      {/* Pro Plan Summary */}
      <div className="bg-slate-950/70 p-6 rounded-2xl border border-purple-500/40 space-y-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">{PRO_PLAN.name}</h2>
              <span className="text-[11px] text-cyan-400 font-medium">{PRO_PLAN.wordLimit}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">
              {PRO_PLAN.pricePkr}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">({PRO_PLAN.priceUsd})</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-semibold">Included Features:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
            {PRO_PLAN.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* NayaPay Account & IBAN Details */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-black p-6 rounded-3xl border border-cyan-500/30 space-y-5 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-cyan-200">NayaPay Payment Details</h2>
          </div>
          <span className="text-[10px] px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
            Instant Transfer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          
          {/* Title */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[10px]">Account Title</span>
            <span className="font-bold text-slate-100 text-sm">{NAYAPAY_DETAILS.accountTitle}</span>
          </div>

          {/* NayaPay ID */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[10px]">NayaPay ID</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-xs">{NAYAPAY_DETAILS.nayapayId}</span>
              <button onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayId, "id")} className="p-1 bg-slate-800 rounded hover:bg-slate-700">
                {copiedField === "id" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mobile / Account Number */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/30 space-y-1 md:col-span-2">
            <span className="text-slate-400 block text-[10px]">Mobile / Account Number</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-emerald-400">{NAYAPAY_DETAILS.nayapayNumber}</span>
              <button onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayNumber, "num")} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                {copiedField === "num" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* NayaPay IBAN (Visible & Functional) */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-cyan-500/30 space-y-1 md:col-span-2">
            <span className="text-slate-400 block text-[10px] flex items-center gap-1">
              <Building className="w-3 h-3 text-cyan-400" /> NayaPay IBAN (Bank Transfer)
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs md:text-sm font-bold text-cyan-300 tracking-wider select-all">
                {NAYAPAY_DETAILS.nayapayIban}
              </span>
              <button onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayIban, "iban")} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                {copiedField === "iban" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>

        <p className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-white/5 leading-relaxed">
          📌 Send <span className="text-emerald-400 font-bold">{PRO_PLAN.pricePkr}</span> to the NayaPay account or IBAN above, then paste your TRX / Reference ID below.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmitPayment} className="space-y-4">
        {message && (
          <div className={`p-4 rounded-xl text-xs font-semibold ${message.type === "success" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
            {message.text}
          </div>
        )}

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
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 text-white text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)]"
        >
          {isSubmitting ? "Submitting Payment..." : "Submit Payment Reference"}
        </button>
      </form>

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 flex items-center justify-center relative font-sans">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}