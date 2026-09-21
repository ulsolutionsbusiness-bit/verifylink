import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  ArrowLeft,
  Lock,
  Globe,
  Radio,
  FileText,
  Copy,
  Check,
  Clock,
  Laptop,
  Compass
} from 'lucide-react';
import type { DetectionStatus } from '../types';

interface ShareableReportProps {
  token: string;
  onBack?: () => void;
}

export const ShareableReport: React.FC<ShareableReportProps> = ({ token, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Report not found or unavailable.');
        }
        setData(json.report || json);
      } catch (err: any) {
        setError(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDetection = (val?: DetectionStatus | string) => {
    if (val === 'detected') return <span className="font-bold text-rose-600">Detected</span>;
    if (val === 'not_detected') return <span className="font-semibold text-emerald-700">Not detected</span>;
    return <span className="font-medium text-slate-500">Unknown</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Generating verification report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Report Unavailable</h2>
          <p className="text-xs text-slate-600 mt-1 mb-4">{error || 'Unable to retrieve report details.'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Return
            </button>
          )}
        </div>
      </div>
    );
  }

  const reportId = data.report_id || data.verification?.token || token;
  const label = data.label || data.verification?.label || 'Verification Case';
  const status = data.status || data.verification?.status || 'active';
  const connection = data.connection || data.result;
  const checklist = data.checklist;
  const notes = data.user_provided_notes || data.notes;
  const recipientName = data.recipient_name || data.user_provided_information?.recipient_name;
  const claimedLocation = data.claimed_location || data.user_provided_information?.claimed_location;
  const purpose = data.purpose || data.user_provided_information?.purpose;
  const profileUrl = data.profile_url || data.profile_information?.profile_url;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between print:hidden">
          {onBack ? (
            <button
              id="report-back-btn"
              onClick={onBack}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          ) : <div />}

          <div className="flex items-center space-x-2">
            <button
              id="report-copy-link-btn"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              id="report-print-btn"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Report Document Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">VerifyLink</h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Factual Signal Report
                  </span>
                </div>
                <p className="text-xs text-slate-500">Voluntary Connection Verification Record</p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
              <div><strong className="text-slate-800">Verification ID:</strong> <span className="font-mono">{reportId}</span></div>
              <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
              <div>
                <strong>Verification Status:</strong>{' '}
                <span className={`uppercase font-bold px-2 py-0.5 rounded text-[10px] ${
                  status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'declined'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Case Identification */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Case Record</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                Factual Evidence Summary
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900">{label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
              {recipientName && <div><strong>Person / Nickname:</strong> {recipientName}</div>}
              {purpose && <div><strong>Verification Context:</strong> {purpose}</div>}
            </div>
          </div>

          {/* If Verification Was Declined */}
          {status === 'declined' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 text-slate-800 space-y-1.5">
              <div className="font-bold flex items-center space-x-2 text-slate-900">
                <XCircle className="w-5 h-5 text-slate-600" />
                <span>Verification Declined by Recipient</span>
              </div>
              <p className="text-xs sm:text-sm italic font-medium pt-1 text-slate-800">
                «“The recipient declined the connection verification. This does not prove fraud.”»
              </p>
              <p className="text-xs text-slate-500">
                In strict compliance with VerifyLink privacy rules, no connection or IP intelligence signals were collected or stored.
              </p>
            </div>
          )}

          {/* 1. Connection Signals */}
          {connection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Observed Connection Signals
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Observed by VerifyLink
                </span>
              </div>

              {/* Location Comparison Block */}
              {claimedLocation && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    <span>Location Comparison</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Claimed Location (User-Provided):</span>
                      <span className="font-semibold text-slate-900">{claimedLocation}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Observed Network Region:</span>
                      <span className="font-semibold text-slate-900">
                        {connection.city && connection.city !== 'Unknown' ? `${connection.city}, ` : ''}{connection.country}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                    <span className="text-slate-600">Regional Comparison:</span>
                    <span className="font-bold text-slate-900">
                      {connection.location_comparison === 'consistent'
                        ? 'Approximate regions appear consistent.'
                        : connection.location_comparison === 'differ'
                        ? 'Approximate regions differ.'
                        : 'Unable to compare.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Factual Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Approximate Location</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {connection.city && connection.city !== 'Unknown' ? `${connection.city}, ` : ''}{connection.country}
                  </div>
                  <div className="text-[10px] text-slate-400">Network routing estimate</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Network / ISP</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={connection.network}>
                    {connection.isp || connection.network}
                  </div>
                  <div className="text-[10px] text-slate-400">{connection.asn || 'ASN unknown'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Connection Type</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {connection.connection_type || connection.network || 'Standard IP Routing'}
                  </div>
                  <div className="text-[10px] text-slate-400">Infrastructure</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">VPN Status</div>
                  <div className="text-sm mt-0.5">{formatDetection(connection.vpn_status)}</div>
                  <div className="text-[10px] text-slate-400">Commercial VPN indicator</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Proxy Status</div>
                  <div className="text-sm mt-0.5">{formatDetection(connection.proxy_status)}</div>
                  <div className="text-[10px] text-slate-400">Open proxy lookup</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Timestamp</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {connection.timestamp ? new Date(connection.timestamp).toLocaleString() : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400">Observed at verification</div>
                </div>
              </div>

              {/* Observed Device & Browser Environment */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Laptop className="w-3.5 h-3.5 text-slate-600" />
                    <span>Observed Device &amp; Browser Environment</span>
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Observed by VerifyLink
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Device Type:</span>
                    <span className="font-bold text-slate-900">{connection.device_type || 'Desktop'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Operating System:</span>
                    <span className="font-bold text-slate-900">{connection.os || 'Unavailable'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Browser:</span>
                    <span className="font-bold text-slate-900">{connection.browser || 'Unavailable'}</span>
                  </div>
                </div>
              </div>

              {/* Evidence Signals */}
              {connection.evidence && connection.evidence.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Signal Observations
                  </div>
                  <div className="space-y-2">
                    {connection.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>{ev.title}</span>
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {ev.type}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Profile Information (if available) */}
          <div className="space-y-2 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Profile Information</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {profileUrl ? 'Provided by User' : 'Unavailable'}
              </span>
            </div>
            {profileUrl ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500 font-medium">Public Profile Link:</div>
                <div className="font-mono text-slate-800 break-all">{profileUrl}</div>
                <div className="text-[11px] text-slate-400 pt-0.5">
                  Supporting reference only. VerifyLink only inspects publicly accessible metadata.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No public profile URL submitted.</p>
            )}
          </div>

          {/* 3. User-Provided Information (Clearly Labeled) */}
          {checklist && (
            <div className="space-y-2 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>User-Provided Information &amp; Context</span>
                </h3>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Provided by User
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className={checklist.location_consistent ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {checklist.location_consistent ? '✓' : '○'}
                  </span>
                  <span>Location consistency marked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={checklist.vpn_detected ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                    {checklist.vpn_detected ? '✓' : '○'}
                  </span>
                  <span>VPN detected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={checklist.money_requested ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                    {checklist.money_requested ? '✓' : '○'}
                  </span>
                  <span>Money or financial transfer requested</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={checklist.urgency_pressure_used ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                    {checklist.urgency_pressure_used ? '✓' : '○'}
                  </span>
                  <span>Urgency or pressure tactics noted</span>
                </div>
              </div>
            </div>
          )}

          {/* User-Provided Case Notes (Clearly Labeled) */}
          {notes && notes.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">User-Provided Case Notes</h3>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Provided by User • Not independently verified
                </span>
              </div>
              <div className="space-y-2">
                {notes.map((n: any) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <p className="text-slate-800">{n.note}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Recorded: {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Limitations Statement (Mandatory) */}
          <div className="border-t border-slate-200 pt-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-700 leading-relaxed space-y-2">
              <div className="font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Core Limitations &amp; Verification Disclaimer</span>
              </div>
              <p className="font-medium text-slate-900">
                “VerifyLink provides factual information and signals for review. It does not determine whether a person is a scammer or criminal. Network location is approximate. VPN/proxy detection may produce false positives. Public information may be incomplete.”
              </p>
              <p className="text-[11px] text-slate-500">
                This document is a technical and contextual signal summary only. It should not be used as the sole basis for accusations, financial decisions, or legal conclusions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
