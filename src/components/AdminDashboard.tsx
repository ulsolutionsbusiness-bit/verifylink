import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import {
  Sliders,
  Users,
  CreditCard,
  ShieldAlert,
  Settings,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import type { UserRole } from '../types';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'settings' | 'audit'>('metrics');
  const [metrics, setMetrics] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Settings editing state
  const [editPriceNgn, setEditPriceNgn] = useState(5000);
  const [editPlanName, setEditPlanName] = useState('VerifyLink Pro');
  const [allowSignups, setAllowSignups] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await apiFetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUserList(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data.settings);
        setEditPriceNgn((data.settings.subscription_price_kobo || 500000) / 100);
        setEditPlanName(data.settings.subscription_plan_name || 'VerifyLink Pro');
        setAllowSignups(data.settings.allow_public_signups ?? true);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await apiFetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMetrics(), fetchUsers(), fetchSettings(), fetchAuditLogs()]);
    } catch (err) {
      setError('Failed to refresh admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    if (!isOwner) {
      alert('Only the system Owner can change user roles.');
      return;
    }
    try {
      const res = await apiFetch(`/api/admin/users/${targetUserId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setSuccess('User role updated.');
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleSuspend = async (targetUserId: string, currentlySuspended: boolean) => {
    try {
      const res = await apiFetch(`/api/admin/users/${targetUserId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !currentlySuspended })
      });
      if (res.ok) {
        setSuccess(!currentlySuspended ? 'User suspended.' : 'User unsuspended.');
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user status.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!isOwner) {
      alert('Only the system Owner can delete user records.');
      return;
    }
    if (!confirm('Permanently delete this user, their verifications, and their notes?')) return;
    try {
      const res = await apiFetch(`/api/admin/users/${targetUserId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('User record permanently removed.');
        fetchUsers();
        fetchMetrics();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_price_kobo: Math.round(editPriceNgn * 100),
          subscription_plan_name: editPlanName.trim(),
          allow_public_signups: allowSignups
        })
      });
      if (res.ok) {
        setSuccess('System settings saved successfully.');
        fetchSettings();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = userList.filter(
    u =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin & Owner Console</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time subscriber management, system settings, and security audit trail
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={reloadAll}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview Metrics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          User & Subscriber Accounts ({userList.length})
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            System Settings
          </button>
        )}
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Security Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Users</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{metrics?.totalUsers ?? '—'}</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-600 uppercase">Active Subscribers</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{metrics?.activeSubscribers ?? '—'}</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Expired Subs</div>
              <div className="text-2xl font-black text-slate-700 mt-1">{metrics?.expiredSubscribers ?? '—'}</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-blue-600 uppercase">Total Verifications</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{metrics?.verificationRequests ?? '—'}</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-600 uppercase">Completed</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{metrics?.completedVerifications ?? '—'}</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Declined</div>
              <div className="text-2xl font-black text-slate-700 mt-1">{metrics?.declinedVerifications ?? '—'}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-600 space-y-2">
            <h3 className="font-bold text-slate-900 text-base">VerifyLink Integrity Guardrails</h3>
            <p>
              • <strong>Role Boundaries:</strong> The Owner (<code className="font-mono text-xs">ulsolutions.business@gmail.com</code>) holds the single authority to promote/demote Administrators and delete accounts.
            </p>
            <p>
              • <strong>Server Authorization:</strong> Protected API endpoints enforce backend <code className="font-mono text-xs">requireAccess()</code> checks, guaranteeing unauthenticated or unsubscribed users cannot bypass access rules via UI tampering.
            </p>
            <p>
              • <strong>Data Minimization:</strong> IP addresses are truncated/masked upon completion, preventing indefinite raw storage.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email, or role..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="text-xs text-slate-500">Showing {filteredUsers.length} users</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {isOwner ? (
                        <select
                          value={u.role}
                          onChange={e => handleUpdateRole(u.id, e.target.value as UserRole)}
                          className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold capitalize"
                        >
                          <option value="user">User (Free)</option>
                          <option value="subscriber">Subscriber</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span className="font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.subscription ? (
                        <span
                          className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                            u.subscription.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.subscription.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.suspended ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleSuspend(u.id, Boolean(u.suspended))}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                          u.suspended
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {u.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="px-2 py-1 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                          title="Delete User"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS (OWNER ONLY) */}
      {activeTab === 'settings' && isOwner && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">VerifyLink Platform Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Plan Name
              </label>
              <input
                type="text"
                value={editPlanName}
                onChange={e => setEditPlanName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Monthly Price (NGN)
              </label>
              <input
                type="number"
                value={editPriceNgn}
                onChange={e => setEditPriceNgn(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Amount charged via Paystack in Nigerian Naira (e.g. 5,000 NGN).
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={allowSignups}
                  onChange={e => setAllowSignups(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-800">Allow Public Account Signups</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Immutable System Audit Logs
            </h2>
            <span className="text-xs text-slate-500">{auditLogs.length} events logged</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {auditLogs.length > 0 ? (
              auditLogs.map(log => (
                <div key={log.id} className="p-3 text-xs flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Actor: <span className="font-mono">{log.actor_user_id}</span> • Target:{' '}
                      <span className="font-mono">{log.target_id || 'system'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">No audit logs recorded yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
