'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, Eye, EyeOff, Trash2, X } from 'lucide-react';

// Supabase Client Initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Payment {
  id: string;
  user_id: string;
  amount?: number;
  price_pkr?: string;
  reference_id?: string;
  transaction_id?: string;
  user_email?: string;
  status: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  is_approved: boolean;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

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

    let userIsAdmin = false;

    // 1. Check Direct Email Match
    if (user.email === 'workaura0@gmail.com' || user.email === 'workaur0@gmail.com') {
      userIsAdmin = true;
    } else {
      // 2. Fallback check from database profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_admin) {
        userIsAdmin = true;
      }
    }

    if (userIsAdmin) {
      setIsAdmin(true);
      await Promise.all([fetchPayments(), fetchUsers()]);
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

  const fetchUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/users', {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    const result = await response.json();
    if (response.ok) setUsers(result.users);
    else setNotice(result.error || 'Unable to load users');
  };

  const handlePasswordUpdate = async (userId: string) => {
    const password = newPasswords[userId] || '';
    if (password.length < 8) {
      setNotice('Password must contain at least 8 characters.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userId, password }),
    });
    const result = await response.json();
    setNotice(response.ok ? 'Password updated successfully.' : result.error || 'Unable to update password');
    if (response.ok) setNewPasswords((current) => ({ ...current, [userId]: '' }));
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email || 'this user'} permanently?`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userId: user.id }),
    });
    const result = await response.json();
    if (response.ok) {
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setNotice('User deleted successfully.');
    } else {
      setNotice(result.error || 'Unable to delete user');
    }
  };

  const handleAccountApproval = async (user: AdminUser, approved: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userId: user.id, approved }),
    });
    const result = await response.json();
    if (response.ok) {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, is_approved: approved } : item));
      setNotice(approved ? 'User account approved.' : 'User account rejected.');
    } else {
      setNotice(result.error || 'Unable to update account approval');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      setNotice('Error updating status: ' + error.message);
    } else {
      if (newStatus === 'approved') {
        const payment = payments.find((item) => item.id === id);
        if (payment) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              total_characters: 10000,
              used_characters: 0,
              plan_name: 'Pro Plan',
              plan_status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.user_id);

          if (profileError) {
            setNotice('Payment approved, but quota reset failed: ' + profileError.message);
            await fetchPayments();
            return;
          }
        }
      }
      setNotice(`Payment ${newStatus} successfully!`);
      fetchPayments(); // Refresh list
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <p className="animate-pulse text-slate-400">Loading Payments Panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm">
          You do not have admin permissions to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Admin - Payment Approval Panel</h1>
            <p className="text-xs text-slate-400 mt-1">Approve or reject pending user payment requests.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
            Admin Verified
          </span>
        </div>

        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.startsWith('Error') ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
            {notice}
          </div>
        )}

        <div className="overflow-x-auto bg-slate-900/60 rounded-xl p-4 border border-slate-800 backdrop-blur-md">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-3">Reference ID</th>
                <th className="p-3">User Email</th>
                <th className="p-3">User ID</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No payments found in database.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-yellow-400 text-xs">{p.reference_id || p.transaction_id || 'N/A'}</td>
                    <td className="p-3 text-xs text-cyan-300">{p.user_email || 'N/A'}</td>
                    <td className="p-3 text-xs text-slate-400 font-mono">{p.user_id}</td>
                    <td className="p-3 font-semibold text-emerald-400">{p.amount ?? p.price_pkr ?? 'N/A'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                          p.status === 'approved'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : p.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}
                      >
                        {p.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(p.id, 'approved')}
                        title="Approve payment"
                        aria-label="Approve payment"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-all"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(p.id, 'rejected')}
                        title="Reject payment"
                        aria-label="Reject payment"
                        className="bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto bg-slate-900/60 rounded-xl p-4 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Users</h2>
            <span className="text-xs text-slate-400">{users.length} accounts</span>
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-3">Email</th>
                <th className="p-3">User ID</th>
                <th className="p-3">Created</th>
                <th className="p-3">Account Status</th>
                <th className="p-3">New Password</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-3 text-xs text-cyan-300">{user.email || 'No email'}</td>
                  <td className="p-3 text-xs text-slate-500 font-mono">{user.id}</td>
                  <td className="p-3 text-xs text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase ${user.is_approved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                      {user.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3 flex items-center gap-2">
                    <div className="relative w-44">
                      <input
                        type={visiblePasswords[user.id] ? "text" : "password"}
                        minLength={8}
                        value={newPasswords[user.id] || ''}
                        onChange={(event) => setNewPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                        placeholder="Min 8 characters"
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 pr-9 text-xs text-white"
                      />
                      <button
                        type="button"
                        title={visiblePasswords[user.id] ? "Hide password" : "Show password"}
                        onClick={() => setVisiblePasswords((current) => ({ ...current, [user.id]: !current[user.id] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {visiblePasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handlePasswordUpdate(user.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                    >
                      Set Password
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user)}
                      title={`Delete ${user.email || 'user'}`}
                      aria-label={`Delete ${user.email || 'user'}`}
                      className="rounded-lg bg-rose-600 p-2 text-white transition-colors hover:bg-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccountApproval(user, true)}
                      title="Approve user account"
                      aria-label="Approve user account"
                      className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccountApproval(user, false)}
                      title="Reject user account"
                      aria-label="Reject user account"
                      className="rounded-lg bg-orange-600 p-2 text-white transition-colors hover:bg-orange-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}