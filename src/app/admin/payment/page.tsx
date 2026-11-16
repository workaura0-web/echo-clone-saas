"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db, isAdminEmail, ADMIN_EMAIL } from "@/lib/firebase/auth";
import {
  adminApplyUserPlan,
  createNotification,
} from "@/lib/firebase/db";
import { computePackageStatus, getPlanDefinition, PLANS, PlanId } from "@/lib/plans";
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
  RefreshCw,
  ShieldAlert,
  Trash2,
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (isAdminEmail(user.email)) {
        setIsAdmin(true);
        await Promise.all([fetchPayments(), fetchUsers()]);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
          planId: (data.planId as PlanId) || "pro",
          planName: data.planName || "Creator Pro",
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

  const handleAssignPlan = async (userRow: AdminUserRow, newPlanId: PlanId) => {
    try {
      await adminApplyUserPlan(userRow.id, newPlanId, { resetUsage: true, validityDays: 30 });
      setNotice(`Updated ${userRow.email} to ${PLANS[newPlanId].name} (30 days, quota reset).`);
      await fetchUsers();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to assign plan");
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
      setNotice(`Marked ${userRow.email}'s package expired and sent expiry alert.`);
      await fetchUsers();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to expire package");
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
      setNotice(approved ? `${userRow.email} activated.` : `${userRow.email} suspended.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update account status");
    }
  };

  const handleDeleteUser = async (userRow: AdminUserRow) => {
    if (!window.confirm(`Remove user ${userRow.email} from Firestore?`)) return;
    try {
      await deleteDoc(doc(db, "users", userRow.id));
      await deleteDoc(doc(db, "profiles", userRow.id));
      setUsers((curr) => curr.filter((u) => u.id !== userRow.id));
      setNotice("User record removed.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handlePaymentStatus = async (payment: Payment, newStatus: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "payments", payment.id), { status: newStatus });

      if (newStatus === "approved" && payment.userId) {
        const planId: PlanId =
          payment.planId === "enterprise" || payment.planName.toLowerCase().includes("enterprise")
            ? "enterprise"
            : "pro";
        await adminApplyUserPlan(payment.userId, planId, {
          resetUsage: true,
          validityDays: 30,
        });
      } else if (newStatus === "rejected" && payment.userId) {
        await createNotification(payment.userId, {
          title: "Payment Verification Failed",
          message: `Reference ${payment.transactionId || payment.id} could not be verified. Please contact support or resubmit.`,
          type: "warning",
          actionHref: "/checkout",
        });
      }

      setNotice(`Payment ${newStatus} successfully.`);
      await Promise.all([fetchPayments(), fetchUsers()]);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update payment status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Loading Admin Console...
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
  const paidUsersCount = users.filter((u) => u.plan === "pro" || u.plan === "enterprise").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Admin Subscription & User Control
            </h1>
            <p className="text-xs text-slate-400">
              Assign packages, monitor character quotas, trigger expiry notices, and verify payments.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-900">
              Users: <strong className="text-white">{users.length}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-900">
              Paid: <strong className="text-emerald-400">{paidUsersCount}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-900">
              Pending: <strong className="text-amber-400">{pendingPaymentsCount}</strong>
            </div>
          </div>
        </div>

        {notice && (
          <div className="p-3.5 rounded-xl border border-violet-500/40 bg-slate-900 text-xs text-slate-200 flex items-center justify-between">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Users & Package Sync Table */}
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
                    <th className="p-3.5 text-right">Usage</th>
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
                            <option value="free">Starter Free (10k)</option>
                            <option value="pro">Creator Pro (100k)</option>
                            <option value="enterprise">Enterprise (500k)</option>
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
                              title="Reset Quota & Renew +30 Days"
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

        {/* Payment Approvals Table */}
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
      </div>
    </div>
  );
}