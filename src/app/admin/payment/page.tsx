"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth, db, ensureUserProfile, isAdminEmail, ADMIN_EMAIL } from "@/lib/firebase/auth";
import {
  adminApplyUserPlan,
  createNotification,
  resetDefaultPricingPlans,
  savePricingPlan,
  subscribePricingPlans,
} from "@/lib/firebase/db";
import {
  computePackageStatus,
  EDITABLE_PLAN_IDS,
  estimateHoursLabel,
  formatPkrLabel,
  getPlanDefinition,
  PLANS,
  PlanDefinition,
  PlanId,
} from "@/lib/plans";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Check,
  Clock,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sliders,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface Payment {
  id: string;
  userId: string;
  planId: PlanId;
  planName: string;
  amount: number;
  pricePkr?: string;
  transactionId?: string;
  userEmail: string;
  status: string;
  createdAt: string;
}

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  plan: PlanId;
  planName: string;
  characterLimit: number;
  usedCharacters: number;
  planExpiresAt: string;
  isApproved: boolean;
}

type AdminTab = "pricing" | "users" | "payments";

export default function AdminStudioPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("pricing");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [livePlansMap, setLivePlansMap] = useState<Record<PlanId, PlanDefinition>>(PLANS);
  const [draftPlans, setDraftPlans] = useState<Record<PlanId, PlanDefinition>>(PLANS);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const dirtyPlanIdsRef = useRef<Set<PlanId>>(new Set());

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const unsubPlans = subscribePricingPlans((mergedMap) => {
      setLivePlansMap(mergedMap);
      setDraftPlans((prev) => {
        const next = { ...mergedMap };
        dirtyPlanIdsRef.current.forEach((dirtyId) => {
          if (prev[dirtyId]) {
            next[dirtyId] = prev[dirtyId];
          }
        });
        return next;
      });
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (isAdminEmail(user.email)) {
        setIsAdmin(true);
        await ensureUserProfile(user).catch(() => undefined);
        await Promise.all([fetchPayments(), fetchUsers()]);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubPlans();
      unsubscribe();
    };
  }, []);

  const fetchPayments = async () => {
    try {
      const snap = await getDocs(collection(db, "payments"));
      const list: Payment[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId || "",
          planId: (data.planId as PlanId) || "creator",
          planName: data.planName || "Creator",
          amount: Number(data.amount || 0),
          pricePkr: data.pricePkr || "",
          transactionId: data.transactionId || "",
          userEmail: data.userEmail || "",
          status: data.status || "pending",
          createdAt: data.createdAt || "",
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(list);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const [usersSnap, profilesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "profiles")),
      ]);

      const profileMap = new Map<string, Record<string, unknown>>();
      profilesSnap.forEach((p) => {
        profileMap.set(p.id, p.data());
      });

      const list: AdminUserRow[] = [];
      usersSnap.forEach((u) => {
        const udata = u.data();
        const pdata = profileMap.get(u.id) || {};
        const planId = (pdata.plan as PlanId) || "free";
        const planDef = getPlanDefinition(planId);

        list.push({
          id: u.id,
          email: udata.email || (pdata.email as string) || "",
          displayName: udata.displayName || (pdata.displayName as string) || "Creator",
          plan: planId,
          planName: (pdata.planName as string) || planDef.name,
          characterLimit: Number(pdata.characterLimit ?? planDef.characterLimit),
          usedCharacters: Number(pdata.usedCharacters ?? 0),
          planExpiresAt: (pdata.planExpiresAt as string) || "",
          isApproved: pdata.isApproved !== false,
        });
      });
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const updateDraftField = <K extends keyof PlanDefinition>(
    planId: PlanId,
    field: K,
    value: PlanDefinition[K]
  ) => {
    dirtyPlanIdsRef.current.add(planId);
    setDraftPlans((prev) => {
      const current = prev[planId];
      const next: PlanDefinition = { ...current, [field]: value };

      if (field === "pricePkrAmount" || field === "validityDays") {
        next.pricePkr = formatPkrLabel(
          Number(field === "pricePkrAmount" ? value : current.pricePkrAmount),
          Number(field === "validityDays" ? value : current.validityDays)
        );
      }
      if (field === "priceUsd") {
        next.priceDisplayUsd = `$${Number(value) || 0}`;
      }
      if (field === "characterLimit") {
        next.approxHoursLabel = estimateHoursLabel(Number(value) || 0);
      }

      return { ...prev, [planId]: next };
    });
  };

  const handleSaveSinglePlan = async (planId: PlanId) => {
    try {
      setSavingPlanId(planId);
      setNotice(null);
      await savePricingPlan(draftPlans[planId]);
      dirtyPlanIdsRef.current.delete(planId);
      setNotice({
        type: "success",
        text: `"${draftPlans[planId].name}" updated (${draftPlans[planId].pricePkr} · ${draftPlans[planId].characterLimit.toLocaleString()} credits · ${draftPlans[planId].isVisible !== false ? "Visible on Home" : "Hidden from Home"}). Homepage & Checkout are now synced live!`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save pricing plan.",
      });
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleSaveAllPlans = async () => {
    try {
      setSavingAll(true);
      setNotice(null);
      await Promise.all(EDITABLE_PLAN_IDS.map((id) => savePricingPlan(draftPlans[id])));
      dirtyPlanIdsRef.current.clear();
      setNotice({
        type: "success",
        text: "All pricing packages & credits saved and published live to Homepage and Checkout.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish all plans.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all packages back to recommended PKR 2,000–10,000 defaults?")) return;
    try {
      setSavingAll(true);
      dirtyPlanIdsRef.current.clear();
      await resetDefaultPricingPlans();
      setNotice({
        type: "success",
        text: "Pricing packages reset to default tiers and published live.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reset pricing defaults.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const handleAssignPlan = async (userRow: AdminUserRow, newPlanId: PlanId) => {
    try {
      await adminApplyUserPlan(userRow.id, newPlanId, {
        resetUsage: true,
        livePlansMap,
      });
      const assigned = getPlanDefinition(newPlanId, livePlansMap);
      setNotice({
        type: "success",
        text: `Updated ${userRow.email} to ${assigned.name} (${assigned.characterLimit.toLocaleString()} credits / ${assigned.validityDays} days).`,
      });
      await fetchUsers();
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to assign plan",
      });
    }
  };

  const handleExpireUserNow = async (userRow: AdminUserRow) => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, "profiles", userRow.id), {
        planExpiresAt: yesterday,
        updatedAt: new Date().toISOString(),
      });
      await createNotification(userRow.id, {
        title: `${userRow.planName} Package Expired`,
        message: `Your ${userRow.planName} package has expired. Please renew or select a package to resume audio generation.`,
        type: "expired",
        actionHref: `/checkout?plan=${userRow.plan}`,
      });
      setNotice({
        type: "success",
        text: `Marked ${userRow.email}'s package expired and sent expiry alert.`,
      });
      await fetchUsers();
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to expire package",
      });
    }
  };

  const handleAccountApproval = async (userRow: AdminUserRow, approved: boolean) => {
    try {
      await updateDoc(doc(db, "profiles", userRow.id), {
        isApproved: approved,
        updatedAt: new Date().toISOString(),
      });
      setUsers((curr) =>
        curr.map((u) => (u.id === userRow.id ? { ...u, isApproved: approved } : u))
      );
      setNotice({
        type: "success",
        text: approved ? `${userRow.email} activated.` : `${userRow.email} suspended.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update account status",
      });
    }
  };

  const handleDeleteUser = async (userRow: AdminUserRow) => {
    if (!window.confirm(`Remove user ${userRow.email} from Firestore?`)) return;
    try {
      await deleteDoc(doc(db, "users", userRow.id));
      await deleteDoc(doc(db, "profiles", userRow.id));
      setUsers((curr) => curr.filter((u) => u.id !== userRow.id));
      setNotice({ type: "success", text: "User record removed." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete user",
      });
    }
  };

  const handlePaymentStatus = async (payment: Payment, newStatus: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "payments", payment.id), { status: newStatus });

      if (newStatus === "approved" && payment.userId) {
        const targetPlanId: PlanId =
          payment.planId && payment.planId in livePlansMap
            ? payment.planId
            : "creator";
        await adminApplyUserPlan(payment.userId, targetPlanId, {
          resetUsage: true,
          livePlansMap,
        });
      } else if (newStatus === "rejected" && payment.userId) {
        await createNotification(payment.userId, {
          title: "Payment Verification Failed",
          message: `Reference ${payment.transactionId || payment.id} could not be verified. Please contact support or resubmit.`,
          type: "warning",
          actionHref: "/checkout",
        });
      }

      setNotice({ type: "success", text: `Payment ${newStatus} successfully.` });
      await Promise.all([fetchPayments(), fetchUsers()]);
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update payment status",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Loading Admin Studio...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
        <h1 className="text-xl font-bold">Admin Access Required</h1>
        <p className="text-slate-400 text-xs">
          Please sign in with the administrator account ({ADMIN_EMAIL}).
        </p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const pendingPaymentsCount = payments.filter((p) => p.status === "pending").length;
  const paidUsersCount = users.filter((u) => u.plan !== "free").length;

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-7">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-6">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Admin Studio & Live Package Control
            </h1>
            <p className="text-xs text-slate-300">
              Edit pricing & credits live for Homepage & Checkout, manage user accounts, and approve NayaPay payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <div className="px-3.5 py-2 rounded-xl border border-sky-500/30 bg-sky-950/35">
              Users: <strong className="text-sky-300">{users.length}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/35">
              Paid: <strong className="text-emerald-300">{paidUsersCount}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-950/35">
              Pending TRX: <strong className="text-amber-300">{pendingPaymentsCount}</strong>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-indigo-500/25 bg-slate-950/80">
            <button
              type="button"
              onClick={() => setActiveTab("pricing")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "pricing"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Pricing & Credits Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users & Quotas ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "payments"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Payment Queue ({pendingPaymentsCount})
            </button>
          </div>

          {activeTab === "pricing" && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/#pricing"
                className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap"
              >
                Preview Homepage Pricing
              </Link>
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={savingAll}
                className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveAllPlans}
                disabled={savingAll}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                {savingAll ? "Publishing..." : "Publish All Changes"}
              </button>
            </div>
          )}
        </div>

        {notice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-4 ${
              notice.type === "error"
                ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: LIVE PRICING & CREDITS EDITOR */}
        {activeTab === "pricing" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {EDITABLE_PLAN_IDS.map((planId) => {
              const plan = draftPlans[planId];
              const isSaving = savingPlanId === planId;

              const tierStyle =
                planId === "starter"
                  ? "border-sky-500/35 bg-gradient-to-b from-sky-950/30 via-[#0d1226] to-[#0a0e1d]"
                  : planId === "creator"
                  ? "border-fuchsia-500/50 bg-gradient-to-b from-violet-950/45 via-[#0d1226] to-[#0a0e1d]"
                  : planId === "pro"
                  ? "border-emerald-500/35 bg-gradient-to-b from-emerald-950/30 via-[#0d1226] to-[#0a0e1d]"
                  : planId === "business"
                  ? "border-amber-500/35 bg-gradient-to-b from-amber-950/25 via-[#0d1226] to-[#0a0e1d]"
                  : "border-indigo-500/25 bg-[#0d1226]/90";

              return (
                <div
                  key={planId}
                  className={`rounded-2xl border p-6 space-y-5 shadow-lg shadow-indigo-950/20 ${tierStyle}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          Plan ID: {plan.id}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            plan.isVisible !== false ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          · {plan.isVisible !== false ? "Live on Home" : "Hidden on Home"}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white">{plan.name}</h2>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={plan.isVisible !== false}
                          onChange={(e) =>
                            updateDraftField(planId, "isVisible", e.target.checked)
                          }
                          className="accent-violet-500"
                        />
                        Show on Home
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(plan.isPopular)}
                          onChange={(e) =>
                            updateDraftField(planId, "isPopular", e.target.checked)
                          }
                          className="accent-violet-500"
                        />
                        Most Popular
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">
                        Package Name
                      </label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updateDraftField(planId, "name", e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">
                        Tagline / Target Users
                      </label>
                      <input
                        type="text"
                        value={plan.tagline}
                        onChange={(e) => updateDraftField(planId, "tagline", e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">
                        Price (PKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={plan.pricePkrAmount}
                        onChange={(e) =>
                          updateDraftField(planId, "pricePkrAmount", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-violet-500"
                      />
                      <span className="text-[11px] text-emerald-400 font-mono block">
                        Display: {plan.pricePkr}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">
                        Price (USD $)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={plan.priceUsd}
                        onChange={(e) =>
                          updateDraftField(planId, "priceUsd", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">
                        Monthly Credits / Characters
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={plan.characterLimit}
                        onChange={(e) =>
                          updateDraftField(planId, "characterLimit", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-violet-500"
                      />
                      <span className="text-[11px] text-sky-400 font-mono block">
                        {plan.characterLimit.toLocaleString()} credits · {plan.approxHoursLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium block">
                          Max Chars / Gen
                        </label>
                        <input
                          type="number"
                          min={500}
                          step={1000}
                          value={plan.maxCharsPerGeneration}
                          onChange={(e) =>
                            updateDraftField(
                              planId,
                              "maxCharsPerGeneration",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium block">
                          Validity (Days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={plan.validityDays}
                          onChange={(e) =>
                            updateDraftField(planId, "validityDays", Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-400 font-medium block">
                      Package Bullet Features (one line per bullet)
                    </label>
                    <textarea
                      rows={4}
                      value={plan.features.join("\n")}
                      onChange={(e) =>
                        updateDraftField(
                          planId,
                          "features",
                          e.target.value.split("\n")
                        )
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Sort Order: {plan.sortOrder}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveSinglePlan(planId)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? "Saving..." : "Save & Update Homepage"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: USERS & PACKAGE SYNC TABLE */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">
              Registered Accounts & Synced Packages ({users.length})
            </h2>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3.5">Account</th>
                      <th className="p-3.5">Package</th>
                      <th className="p-3.5 text-right">Credits Used</th>
                      <th className="p-3.5">Validity</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {users.map((u) => {
                      const status = computePackageStatus({
                        plan: u.plan,
                        characterLimit: u.characterLimit,
                        usedCharacters: u.usedCharacters,
                        planExpiresAt: u.planExpiresAt,
                        isApproved: u.isApproved,
                      });

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{u.displayName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={u.plan}
                              onChange={(e) => handleAssignPlan(u, e.target.value as PlanId)}
                              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
                            >
                              {EDITABLE_PLAN_IDS.map((pid) => {
                                const p = livePlansMap[pid];
                                return (
                                  <option key={pid} value={pid}>
                                    {p.name} ({p.characterLimit.toLocaleString()} credits)
                                  </option>
                                );
                              })}
                              {u.plan === "enterprise" && (
                                <option value="enterprise">Studio Enterprise (Legacy)</option>
                              )}
                            </select>
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums">
                            <span>{u.usedCharacters.toLocaleString()}</span>
                            <span className="text-slate-500">
                              {" "}
                              / {u.characterLimit.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono tabular-nums">
                            {!u.isApproved ? (
                              <span className="text-rose-400">Suspended</span>
                            ) : status.isExpired ? (
                              <span className="text-rose-400">Expired</span>
                            ) : (
                              <span className="text-emerald-400">{status.daysRemaining}d left</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAssignPlan(u, u.plan)}
                                title="Reset Quota & Renew"
                                className="p-1.5 rounded border border-slate-700 bg-slate-950 hover:bg-slate-800 text-sky-400"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExpireUserNow(u)}
                                title="Trigger Expiry & Send Notification"
                                className="p-1.5 rounded border border-slate-700 bg-slate-950 hover:bg-slate-800 text-amber-400"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAccountApproval(u, !u.isApproved)}
                                title={u.isApproved ? "Suspend Account" : "Activate Account"}
                                className="p-1.5 rounded border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300"
                              >
                                {u.isApproved ? (
                                  <X className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title="Remove User"
                                className="p-1.5 rounded border border-slate-700 bg-slate-950 hover:bg-rose-950 text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No registered users found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT VERIFICATION QUEUE */}
        {activeTab === "payments" && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">
              Payment Verification Queue ({payments.length})
            </h2>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Requested Plan</th>
                      <th className="p-3.5">TRX Reference</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-mono text-white">
                          {p.userEmail || p.userId}
                        </td>
                        <td className="p-3.5 font-semibold">{p.planName}</td>
                        <td className="p-3.5 font-mono text-slate-400">
                          {p.transactionId || "—"}
                        </td>
                        <td className="p-3.5 font-mono tabular-nums">
                          ${p.amount} {p.pricePkr ? `· ${p.pricePkr}` : ""}
                        </td>
                        <td className="p-3.5 capitalize font-semibold">
                          <span
                            className={
                              p.status === "approved"
                                ? "text-emerald-400"
                                : p.status === "rejected"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePaymentStatus(p, "approved")}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                            >
                              Approve & Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaymentStatus(p, "rejected")}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No payment submissions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}