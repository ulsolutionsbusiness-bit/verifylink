import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import {
  ShieldCheck,
  Plus,
  FileSearch,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Lock,
  ArrowRight,
  Filter,
  Copy,
  Check,
  Radio,
  FileText,
  AlertCircle,
  Crown,
  ExternalLink,
  Laptop
} from 'lucide-react';
import type { VerificationRequest } from '../types';
import { CreateVerificationModal } from './CreateVerificationModal';
import { ProfileAnalyzerModal } from './ProfileAnalyzerModal';
import { CaseDetailModal } from './CaseDetailModal';

interface DashboardProps {
  onNavigateToPricing: () => void;
  onOpenPublicReport: (token: string) => void;
  initialCreateOpen?: boolean;
  initialAnalyzerOpen?: boolean;
  initialFilterStatus?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToPricing,
  onOpenPublicReport,
  initialCreateOpen = false,
  initialAnalyzerOpen = false,
  initialFilterStatus = 'all'
}) => {
  const { user, hasAccess } = useAuth();

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(initialCreateOpen);
  const [analyzerModalOpen, setAnalyzerModalOpen] = useState(initialAnalyzerOpen);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (initialCreateOpen) {
      setCreateModalOpen(true);
    }
  }, [initialCreateOpen]);

  useEffect(() => {
    if (initialAnalyzerOpen) {
      setAnalyzerModalOpen(true);
    }
  }, [initialAnalyzerOpen]);

  useEffect(() => {
    if (initialFilterStatus) {
      setFilterStatus(initialFilterStatus);
    }
  }, [initialFilterStatus]);

  const fetchVerifications = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/verifications');
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications || []);
      }
    } catch (err) {
      console.error('Failed to load verifications:', err);
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/verify/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredList = verifications.filter(item => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.recipient_name && item.recipient_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.claimed_location && item.claimed_location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Completed
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Declined
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Active
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Expired
          </span>
        );
      case 'invalidated':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            Invalidated
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clear Owner/Admin Indicator */}
      {user?.role === 'owner' && (
        <div id="owner-status-indicator" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white shadow-sm border border-indigo-500/40">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Platform Owner Account</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">Lifetime Unrestricted Access</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Authenticated as <strong className="text-white font-semibold">{user.email}</strong> • Subscription requirements bypassed. Full access to all verification tools and administrative capabilities.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/30 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>Owner Privileges Active</span>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div id="admin-status-indicator" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white shadow-sm border border-purple-500/40">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Administrator Account</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-400 text-slate-950">Full Admin Access</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Authenticated as <strong className="text-white font-semibold">{user.email}</strong> • Full verification features and administrative controls active.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Verification Dashboard</h1>
            {(user?.role === 'owner' || user?.role === 'admin') && (
              <span
                id="dashboard-admin-owner-badge"
                className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Admin/Owner</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create voluntary verification requests and review factual connection signals
          </p>
        </div>

        {hasAccess && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action: + Create Verification Request (Most Prominent) */}
            <button
              id="dash-create-link-btn"
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold flex items-center space-x-2 shadow-md hover:shadow-lg transition-all ring-2 ring-blue-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Create Verification Request</span>
            </button>

            {/* Secondary Action: Analyze Public Profile */}
            <button
              id="dash-analyze-profile-btn"
              onClick={() => setAnalyzerModalOpen(true)}
              className="px-3.5 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSearch className="w-4 h-4 text-slate-500" />
              <span>Analyze Public Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* If User Does Not Have Pro Access */}
      {!hasAccess && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Subscription Required for Verification Tools</h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                You are currently signed in to a free account. An active subscription is required to generate connection verification requests, review factual evidence, and export case reports.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <button
              id="dash-upgrade-btn"
              onClick={onNavigateToPricing}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs flex items-center space-x-2"
            >
              <span>Upgrade to VerifyLink Pro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500">₦5,000 / month • Cancel anytime</span>
          </div>
        </div>
      )}

      {/* Main Content (when hasAccess) */}
      {hasAccess && (
        <div className="space-y-4">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Cases</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{verifications.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Active Links</div>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {verifications.filter(v => v.status === 'active').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {verifications.filter(v => v.status === 'completed').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Declined</div>
              <div className="text-xl font-bold text-slate-700 mt-1">
                {verifications.filter(v => v.status === 'declined').length}
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
              {[
                { label: 'All Cases', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Declined', value: 'declined' },
                { label: 'Expired', value: 'expired' }
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    filterStatus === tab.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cases, token, name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Cases List */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Loading cases...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No verification cases found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Create a voluntary verification request to begin reviewing factual connection signals.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Verification Request</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {filteredList.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {item.label}
                      </h4>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Token: <strong className="font-mono text-slate-800">{item.token}</strong></span>
                      {item.claimed_location && (
                        <span>Claimed Location: <strong className="text-slate-800">{item.claimed_location}</strong></span>
                      )}
                      <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                      {item.result && (
                        <span className="text-emerald-700 font-medium">
                          Signal observed: {item.result.country} ({item.result.isp || item.result.network})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on Item */}
                  <div className="flex items-center space-x-2 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                    {item.status === 'active' && (
                      <button
                        onClick={e => handleCopyLink(item.token, e)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                        title="Copy verification link"
                      >
                        {copiedToken === item.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{copiedToken === item.token ? 'Copied' : 'Link'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenPublicReport(item.token)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                      title="View Report"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Report</span>
                    </button>

                    <button
                      onClick={() => setSelectedCaseId(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                    >
                      View Workspace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateVerificationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(vreq) => {
          fetchVerifications();
          setSelectedCaseId(vreq.id);
        }}
      />

      <ProfileAnalyzerModal
        isOpen={analyzerModalOpen}
        onClose={() => setAnalyzerModalOpen(false)}
        onCreateVerification={() => {
          setAnalyzerModalOpen(false);
          setCreateModalOpen(true);
        }}
      />

      <CaseDetailModal
        requestId={selectedCaseId}
        isOpen={Boolean(selectedCaseId)}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={fetchVerifications}
        onOpenPublicReport={onOpenPublicReport}
      />
    </div>
  );
};
