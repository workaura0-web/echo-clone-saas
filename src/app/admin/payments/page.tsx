'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  reference_id: string;
  status: string;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndFetchPayments();
  }, []);

  const checkAdminAndFetchPayments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      setIsAdmin(true);
      fetchPayments();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      alert(`Payment ${newStatus} successfully!`);
      fetchPayments(); // Refresh list
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 text-red-500 text-xl font-bold">
        Access Denied: You do not have admin permissions to view this page.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Admin - Payment Approval Panel</h1>

      <div className="overflow-x-auto bg-slate-900 rounded-lg p-4 border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="p-3">Reference ID</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-yellow-400">{p.reference_id || 'N/A'}</td>
                  <td className="p-3 text-xs text-slate-400">{p.user_id}</td>
                  <td className="p-3">${p.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : p.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(p.id, 'approved')}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(p.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded transition"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  reference_id: string;
  status: string;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndFetchPayments();
  }, []);

  const checkAdminAndFetchPayments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      setIsAdmin(true);
      fetchPayments();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      alert(`Payment ${newStatus} successfully!`);
      fetchPayments(); // Refresh list
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 text-red-500 text-xl font-bold">
        Access Denied: You do not have admin permissions to view this page.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Admin - Payment Approval Panel</h1>

      <div className="overflow-x-auto bg-slate-900 rounded-lg p-4 border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="p-3">Reference ID</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-yellow-400">{p.reference_id || 'N/A'}</td>
                  <td className="p-3 text-xs text-slate-400">{p.user_id}</td>
                  <td className="p-3">${p.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : p.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(p.id, 'approved')}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(p.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded transition"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}