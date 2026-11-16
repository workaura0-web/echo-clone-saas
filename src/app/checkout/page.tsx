"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, ensureUserProfile, UserProfile } from "@/lib/firebase/auth";
import { activateFreeStarterPlan, submitPaymentRequest } from "@/lib/firebase/db";
import { PLANS, PlanId, getPlanDefinition } from "@/lib/plans";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  Building,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ShieldCheck,
  User,
} from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get("plan") as PlanId) || "pro";

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    initialPlan === "free" || initialPlan === "enterprise" ? initialPlan : "pro"
  );
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const NAYAPAY_DETAILS = {
    accountTitle: "Abdullah Meraj",
    nayapayId: "Abdullahmeraj25@nayapay",
    nayapayNumber: "03313429680",
    nayapayIban: "PK38 NAYA1234 5033 1342 9680",
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({ id: currentUser.uid, email: currentUser.email || "" });
        const prof = await ensureUserProfile(currentUser);
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const plan = getPlanDefinition(selectedPlan);
  const orderedPlans: PlanId[] = ["free", "pro", "enterprise"];

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleActivateFree = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await activateFreeStarterPlan(user.id);
      setMessage({
        type: "success",
        text: "Starter Free package activated for 30 days (10,000 characters). Redirecting to Studio...",
      });
      setTimeout(() => router.push("/studio/tts"), 1200);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Could not activate Starter plan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: "error", text: "Please sign in before submitting a payment." });
      return;
    }

    if (!transactionId.trim()) {
      setMessage({ type: "error", text: "Please enter your Transaction Reference ID." });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPaymentRequest({
        userId: user.id,
        userEmail: user.email,
        planId: selectedPlan,
        transactionId: transactionId.trim(),
      });
      setMessage({
        type: "success",
        text: `Payment reference submitted for ${plan.name}. Your account will be upgraded as soon as admin verifies the transaction.`,
      });
      setTransactionId("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit payment reference.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Packages & Subscription Checkout
          </h1>
          <p className="text-xs text-slate-400">
            Select a monthly package below. Every plan syncs directly with your Echo Clone account quota.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs flex items-center gap-3">
          <User className="w-4 h-4 text-violet-400" />
          <div>
            <p className="text-slate-400">Account</p>
            <p className="font-semibold text-white">
              {loading
                ? "Loading..."
                : user
                ? `${user.email} (${profile?.planName || "Free"})`
                : "Guest — Sign In Required"}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive 3-Plan Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {orderedPlans.map((key) => {
          const item = PLANS[key];
          const isSelected = selectedPlan === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedPlan(item.id);
                setMessage(null);
              }}
              className={`rounded-xl border p-5 text-left transition-colors flex flex-col justify-between space-y-4 ${
                isSelected
                  ? "border-violet-500 bg-slate-900"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{item.name}</span>
                  {isSelected && (
                    <span className="text-[11px] font-semibold text-violet-400">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {item.priceDisplayUsd}
                  </span>
                  <span className="text-xs text-slate-400">/ {item.pricePkr}</span>
                </div>
                <ul className="space-y-2 pt-2 border-t border-slate-800/80">
                  {item.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium ${
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
              : "border-rose-500/40 bg-rose-950/30 text-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Checkout Action Area */}
      {selectedPlan === "free" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">
              Activate {plan.name}
            </h2>
            <p className="text-xs text-slate-400">
              Includes 10,000 characters valid for 30 days with US & UK accents.
            </p>
          </div>
          <button
            type="button"
            onClick={handleActivateFree}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {isSubmitting ? "Activating..." : "Activate / Renew Free Package"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-white">NayaPay / Bank Transfer</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {plan.pricePkr}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">Account Title</span>
                  <span className="font-semibold text-white">{NAYAPAY_DETAILS.accountTitle}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 block">NayaPay ID</span>
                  <span className="font-mono font-semibold text-sky-300">
                    {NAYAPAY_DETAILS.nayapayId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayId, "id")}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedField === "id" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 block">Mobile / Account Number</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {NAYAPAY_DETAILS.nayapayNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayNumber, "num")}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedField === "num" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Building className="w-3 h-3 text-sky-400" /> IBAN
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    {NAYAPAY_DETAILS.nayapayIban}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(NAYAPAY_DETAILS.nayapayIban, "iban")}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedField === "iban" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmitPayment}
            className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Submit Payment Reference
                </h2>
                <span className="text-xs text-slate-400">{plan.name}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Send <strong className="text-white">{plan.pricePkr}</strong> ({plan.priceDisplayUsd}) to the NayaPay details on the left, then submit your Transaction Reference ID below.
              </p>

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
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {!user ? (
              <Link
                href="/login"
                className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-center text-xs font-semibold"
              >
                Sign In to Submit Payment
              </Link>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                {isSubmitting
                  ? "Submitting..."
                  : `Submit Payment for ${plan.name}`}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 flex justify-center">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading packages...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}