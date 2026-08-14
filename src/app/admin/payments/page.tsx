"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { CheckCircle, XCircle, RefreshCw, ShieldAlert } from "lucide-react";

interface PaymentRecord {
  id: string;
  user_email: string;
  plan_name: string;
  price_pkr: string;
  transaction_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending & recent payments
  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Update Status Function
  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const { error } = await supabase
      .from("payments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      setPayments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-cyan-400">Admin Payment Approvals</h1>
          <p className="text-slate-400 text-xs">Verify NayaPay transactions and update status</p>
        </div>

        <button 
          onClick={fetchPayments} 
          className="p-2.5 bg-slate-900 border border-white/10 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">User Email</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Amount</th>
                <th className="p-4">TRX / Reference ID</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-4 font-medium text-slate-200">{p.user_email}</td>
                    <td className="p-4 font-semibold text-purple-400">{p.plan_name}</td>
                    <td className="p-4 text-emerald-400 font-bold">{p.price_pkr}</td>
                    <td className="p-4 font-mono text-cyan-300 select-all">{p.transaction_id}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        p.status === "approved" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                          : p.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {p.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(p.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(p.id, "rejected")}
                            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}