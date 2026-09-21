import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import {
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Share2,
  Printer,
  Trash2,
  Ban,
  Clock,
  Radio,
  FileText,
  HelpCircle,
  Lock,
  Globe,
  Plus,
  Laptop,
  Smartphone,
  MapPin,
  Compass,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import type {
  VerificationRequest,
  VerificationResult,
  VerificationChecklist,
  CaseNote,
  SignalEvidence,
  DetectionStatus
} from '../types';

interface CaseDetailModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenPublicReport: (token: string) => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  requestId,
  isOpen,
  onClose,
  onRefresh,
  onOpenPublicReport
}) => {
  const [data, setData] = useState<{
    verification: VerificationRequest;
    result?: VerificationResult | null;
    notes?: CaseNote[];
    checklist?: VerificationChecklist;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [copiedVerificationLink, setCopiedVerificationLink] = useState(false);
  const [copiedReportLink, setCopiedReportLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6'>('all');

  useEffect(() => {
    if (!isOpen || !requestId) return;

    async function loadDetail() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/verifications/${encodeURIComponent(requestId!)}`);
        const json = await res.json();
        if (res.ok) {
          setData(json.verification);
        }
      } catch (err) {
        console.error('Error loading case detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [isOpen, requestId]);

  if (!isOpen || !requestId) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await apiFetch(`/api/verifications/${requestId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() })
      });
      if (res.ok) {
        const json = await res.json();
        setData(prev => (prev ? { ...prev, notes: [json.note, ...(prev.notes || [])] } : prev));
        setNewNote('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await apiFetch(`/api/verifications/${requestId}/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setData(prev => (prev ? { ...prev, notes: (prev.notes || []).filter(n => n.id !== noteId) } : prev));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleChecklistChange = async (key: keyof VerificationChecklist, value: boolean | null) => {
    if (!data) return;
    setSavingChecklist(true);
    const updatedChecklist = {
      ...(data.checklist || { verification_request_id: data.verification.id }),
      [key]: value
    };

    try {
      const res = await apiFetch(`/api/verifications/${requestId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChecklist)
      });
      if (res.ok) {
        const json = await res.json();
        setData(prev => (prev ? { ...prev, checklist: json.checklist } : prev));
      }
    } catch (err) {
      console.error('Failed to update checklist:', err);
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleInvalidate = async () => {
    if (!confirm('Are you sure you want to invalidate this verification link immediately?')) return;
    try {
      const res = await apiFetch(`/api/verifications/${requestId}/invalidate`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData(prev => (prev ? { ...prev, verification: json.verification } : prev));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to invalidate link:', err);
    }
  };

  const handleDeleteRecord = async () => {
    if (!confirm('Permanently delete this verification case, results, and case notes? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/verifications/${requestId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete verification:', err);
    }
  };

  const copyVerificationLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/verify/${data.verification.token}`;
    navigator.clipboard.writeText(url);
    setCopiedVerificationLink(true);
    setTimeout(() => setCopiedVerificationLink(false), 2000);
  };

  const copyReportLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/report/${data.verification.token}`;
    navigator.clipboard.writeText(url);
    setCopiedReportLink(true);
    setTimeout(() => setCopiedReportLink(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'declined':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">Declined</span>;
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Active</span>;
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Expired</span>;
      case 'invalidated':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Invalidated</span>;
      default:
        return null;
    }
  };

  const formatDetection = (val?: DetectionStatus) => {
    if (val === 'detected') return <span className="font-bold text-rose-600">Detected</span>;
    if (val === 'not_detected') return <span className="font-semibold text-emerald-700">Not detected</span>;
    return <span className="font-medium text-slate-500">Unknown</span>;
  };

  const renderSourceBadge = (source: 'Observed by VerifyLink' | 'Provided by User' | 'Unavailable') => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (source === 'Observed by VerifyLink') {
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (source === 'Provided by User') {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass} tracking-tight shrink-0`}>
        {source}
      </span>
    );
  };

  // Location comparison computation
  const renderLocationComparison = () => {
    if (!data) return null;
    const claimed = data.verification.claimed_location || data.result?.claimed_location || data.result?.stated_location;
    const result = data.result;

    const observedRegion = result
      ? `${result.city && result.city !== 'Unknown' ? result.city + ', ' : ''}${result.region && result.region !== 'Unknown' ? result.region + ', ' : ''}${result.country}`
      : null;

    let comparisonOutcome: 'Approximate regions appear consistent.' | 'Approximate regions differ.' | 'Unable to compare.' = 'Unable to compare.';

    if (result?.location_comparison === 'consistent') {
      comparisonOutcome = 'Approximate regions appear consistent.';
    } else if (result?.location_comparison === 'differ') {
      comparisonOutcome = 'Approximate regions differ.';
    } else if (result?.location_consistency === 'consistent') {
      comparisonOutcome = 'Approximate regions appear consistent.';
    } else if (result?.location_consistency === 'inconsistent') {
      comparisonOutcome = 'Approximate regions differ.';
    } else if (claimed && observedRegion) {
      const c = claimed.toLowerCase();
      const o = observedRegion.toLowerCase();
      if (c.includes(result?.country.toLowerCase() || '') || o.includes(c)) {
        comparisonOutcome = 'Approximate regions appear consistent.';
      } else {
        comparisonOutcome = 'Approximate regions differ.';
      }
    }

    return (
      <div className="p-4 rounded-xl border bg-slate-50/80 border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Location Comparison</span>
          </span>
          {renderSourceBadge(result ? 'Observed by VerifyLink' : 'Unavailable')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
              <span>Claimed Location</span>
              {renderSourceBadge(claimed ? 'Provided by User' : 'Unavailable')}
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {claimed || <span className="text-slate-400 font-normal italic">Not specified by user</span>}
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
              <span>Observed Network Region</span>
              {renderSourceBadge(observedRegion ? 'Observed by VerifyLink' : 'Unavailable')}
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {observedRegion || <span className="text-slate-400 font-normal italic">Awaiting connection</span>}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Comparison Outcome:</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              comparisonOutcome === 'Approximate regions appear consistent.'
                ? 'bg-emerald-100 text-emerald-800'
                : comparisonOutcome === 'Approximate regions differ.'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {comparisonOutcome}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Note: IP network routing is approximate. Comparison outcomes reflect regional consistency only and are not a scam score or fraud determination.
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-6 max-h-[94vh] overflow-y-auto">
        {/* Header with Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {data?.verification.label || 'Verification Case Workspace'}
                </h2>
                {data && getStatusBadge(data.verification.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verification Token: <span className="font-mono font-semibold text-slate-800">{data?.verification.token}</span> • Created {data ? new Date(data.verification.created_at).toLocaleDateString() : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {data?.verification.status === 'active' && (
              <button
                id="case-modal-copy-link-btn"
                onClick={copyVerificationLink}
                className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center space-x-1.5 border border-blue-200 transition-colors"
                title="Copy verification link to send to recipient"
              >
                {copiedVerificationLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedVerificationLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            )}

            <button
              id="case-modal-open-report-btn"
              onClick={() => onOpenPublicReport(data?.verification.token || '')}
              className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Report</span>
            </button>

            <button
              id="case-modal-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading case details...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Case information unavailable.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation Jump Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs border-b border-slate-100">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Sections
              </button>
              <button
                onClick={() => setActiveTab('1')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '1' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                1. Connection Signals
              </button>
              <button
                onClick={() => setActiveTab('2')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '2' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                2. Profile Info
              </button>
              <button
                onClick={() => setActiveTab('3')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '3' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                3. User Evidence
              </button>
              <button
                onClick={() => setActiveTab('4')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '4' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                4. Response
              </button>
              <button
                onClick={() => setActiveTab('5')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '5' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                5. Private Notes
              </button>
              <button
                onClick={() => setActiveTab('6')}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeTab === '6' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                6. Report
              </button>
            </div>

            {/* ========================================================= */}
            {/* SECTION 1: CONNECTION SIGNALS */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '1') && (
              <section id="case-sec-connection-signals" className="space-y-4 pt-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      1. Connection Signals
                    </h3>
                  </div>
                  {renderSourceBadge(data.result ? 'Observed by VerifyLink' : 'Unavailable')}
                </div>

                {/* Location Comparison Widget */}
                {renderLocationComparison()}

                {data.result ? (
                  <div className="space-y-4">
                    {/* Observed Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                          <span>Approximate Location</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {data.result.city && data.result.city !== 'Unknown' ? `${data.result.city}, ` : ''}{data.result.country}
                        </div>
                        <div className="text-[10px] text-slate-400">Network routing estimate</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Network Operator / ISP</div>
                        <div className="text-sm font-bold text-slate-900 mt-1 truncate" title={data.result.isp || data.result.network}>
                          {data.result.isp || data.result.network}
                        </div>
                        <div className="text-[10px] text-slate-400">{data.result.asn || 'ASN unknown'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Connection Type</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {data.result.connection_type || data.result.network || 'Standard IP Routing'}
                        </div>
                        <div className="text-[10px] text-slate-400">Infrastructure type</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">VPN Status</div>
                        <div className="text-sm mt-1">{formatDetection(data.result.vpn_status)}</div>
                        <div className="text-[10px] text-slate-400">IP intelligence provider</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Proxy Status</div>
                        <div className="text-sm mt-1">{formatDetection(data.result.proxy_status)}</div>
                        <div className="text-[10px] text-slate-400">Open proxy lookup</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Timestamp</div>
                        <div className="text-xs font-semibold text-slate-800 mt-1">
                          {data.result.created_at ? new Date(data.result.created_at).toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400">Observed at consent</div>
                      </div>
                    </div>

                    {/* Observed Device & Browser Details */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-600" />
                          <span>Observed Device &amp; Browser Details</span>
                        </span>
                        {renderSourceBadge('Observed by VerifyLink')}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Device Type:</span>
                          <span className="font-bold text-slate-900">{data.result.device_type || 'Desktop'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Operating System:</span>
                          <span className="font-bold text-slate-900">{data.result.os || 'Unknown OS'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Browser:</span>
                          <span className="font-bold text-slate-900">{data.result.browser || 'Unknown Browser'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Evidence Signals */}
                    {data.result.evidence && data.result.evidence.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Signal Observations
                        </div>
                        <div className="space-y-1.5">
                          {data.result.evidence.map((ev, i) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                                ev.type === 'normal'
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                  : ev.type === 'attention'
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between mb-0.5">
                                <span>{ev.title}</span>
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-white/70">
                                  {ev.type}
                                </span>
                              </div>
                              <p>{ev.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <p className="text-xs text-slate-600 font-medium">
                      Connection signals not yet observed.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Signals will be recorded factually once the recipient opens the link and selects "I Agree & Verify".
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: PROFILE INFORMATION */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '2') && (
              <section id="case-sec-profile-information" className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      2. Profile Information
                    </h3>
                  </div>
                  {renderSourceBadge(data.verification.profile_url ? 'Provided by User' : 'Unavailable')}
                </div>

                {data.verification.profile_url ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Public Profile Link:</span>
                      <a
                        href={data.verification.profile_url.startsWith('http') ? data.verification.profile_url : `https://${data.verification.profile_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>Open URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-sm font-mono text-slate-800 break-all bg-white p-2 rounded-lg border border-slate-200">
                      {data.verification.profile_url}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      VerifyLink only reviews public profile structure. No private accounts, friend lists, or direct messages are accessed.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                    <span>No public profile URL was submitted for this case.</span>
                    {renderSourceBadge('Unavailable')}
                  </div>
                )}
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: USER-PROVIDED EVIDENCE */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '3') && (
              <section id="case-sec-user-evidence" className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      3. User-Provided Evidence
                    </h3>
                  </div>
                  {renderSourceBadge('Provided by User')}
                </div>

                {/* Claimed Details Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                      <span>Claimed Person / Nickname</span>
                      {renderSourceBadge('Provided by User')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {data.verification.recipient_name || <span className="text-slate-400 font-normal italic">Not specified</span>}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                      <span>Verification Purpose / Context</span>
                      {renderSourceBadge('Provided by User')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {data.verification.purpose || <span className="text-slate-400 font-normal italic">General verification</span>}
                    </div>
                  </div>
                </div>

                {/* Transaction Checklist (Labeled: Provided by User) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Transaction Context Indicators
                    </div>
                    <div className="flex items-center space-x-2">
                      {savingChecklist && <span className="text-[11px] text-blue-600 animate-pulse">Saving...</span>}
                      {renderSourceBadge('Provided by User')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-white rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(data.checklist?.money_requested)}
                        onChange={e => handleChecklistChange('money_requested', e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Money or gift cards requested?</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-white rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(data.checklist?.urgency_pressure_used)}
                        onChange={e => handleChecklistChange('urgency_pressure_used', e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Urgency or pressure tactics used?</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-white rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(data.checklist?.payment_details_matched)}
                        onChange={e => handleChecklistChange('payment_details_matched', e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Payment details matched stated person?</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-white rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(data.checklist?.additional_verification_refused)}
                        onChange={e => handleChecklistChange('additional_verification_refused', e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Additional live check refused?</span>
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 4: VERIFICATION RESPONSE */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '4') && (
              <section id="case-sec-verification-response" className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      4. Verification Response
                    </h3>
                  </div>
                  {renderSourceBadge('Observed by VerifyLink')}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Response Status:</span>
                    <div>{getStatusBadge(data.verification.status)}</div>
                  </div>

                  {data.verification.status === 'completed' && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <p className="font-bold">Recipient Consented &amp; Verified</p>
                      <p>
                        Response timestamp: {data.verification.verified_at ? new Date(data.verification.verified_at).toLocaleString() : 'N/A'}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        The recipient agreed to voluntary verification. Network routing signals were captured factually.
                      </p>
                    </div>
                  )}

                  {data.verification.status === 'declined' && (
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-1">
                      <p className="font-bold">Recipient Declined</p>
                      <p>
                        Response timestamp: {data.verification.verified_at ? new Date(data.verification.verified_at).toLocaleString() : 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-600 italic">
                        The recipient declined the connection verification. This does not prove fraud.
                      </p>
                    </div>
                  )}

                  {data.verification.status === 'active' && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-2">
                      <p className="font-bold">Awaiting Recipient Response</p>
                      <p className="text-[11px]">
                        The link is active and will expire on {new Date(data.verification.expires_at).toLocaleString()}.
                      </p>
                      <div className="pt-1 flex items-center space-x-2">
                        <button
                          onClick={copyVerificationLink}
                          className="py-1 px-2.5 rounded bg-blue-600 text-white font-semibold text-[11px] flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedVerificationLink ? 'Copied' : 'Copy Verification Link'}</span>
                        </button>
                        <button
                          onClick={handleInvalidate}
                          className="py-1 px-2.5 rounded bg-white text-rose-600 border border-rose-200 font-semibold text-[11px] hover:bg-rose-50"
                        >
                          Invalidate Link Now
                        </button>
                      </div>
                    </div>
                  )}

                  {data.verification.status === 'expired' && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                      This verification link expired on {new Date(data.verification.expires_at).toLocaleString()} without a recorded response.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 5: PRIVATE NOTES */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '5') && (
              <section id="case-sec-private-notes" className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      5. Private Notes
                    </h3>
                  </div>
                  {renderSourceBadge('Provided by User')}
                </div>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add private observation or evidence context..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 italic">
                      Private to your account.
                    </span>
                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{addingNote ? 'Saving...' : 'Add Note'}</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                  {data.notes && data.notes.length > 0 ? (
                    data.notes.map(n => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <p className="text-slate-800 whitespace-pre-wrap">{n.note}</p>
                          <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2">No private notes yet.</p>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================= */}
            {/* SECTION 6: REPORT */}
            {/* ========================================================= */}
            {(activeTab === 'all' || activeTab === '6') && (
              <section id="case-sec-report" className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      6. Factual Case Report
                    </h3>
                  </div>
                  {renderSourceBadge('Observed by VerifyLink')}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generate or share a sanitized, read-only factual verification report. The report contains verified connection signals, observed metadata, and user-provided context with standard legal limitations.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      id="case-modal-view-full-report-btn"
                      onClick={() => onOpenPublicReport(data.verification.token)}
                      className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Full Report</span>
                    </button>

                    <button
                      id="case-modal-copy-report-link-btn"
                      onClick={copyReportLink}
                      className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 flex items-center space-x-1.5"
                    >
                      {copiedReportLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReportLink ? 'Report Link Copied' : 'Copy Report Link'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <div className="font-semibold text-slate-700">Report Core Limitations:</div>
                    <p>
                      VerifyLink provides factual information and signals for review. It does not determine whether a person is a scammer or criminal. Network location is approximate. VPN/proxy detection may produce false positives. Public information may be incomplete.
                    </p>
                  </div>
                </div>

                {/* Permanent Delete Option */}
                <div className="pt-3 flex justify-end border-t border-slate-200/70">
                  <button
                    onClick={handleDeleteRecord}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center space-x-1 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete this entire case record</span>
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
