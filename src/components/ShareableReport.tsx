import React, { useState, useEffect } from 'react';
import { getPublicReportUrl } from '../utils/publicUrl';
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
  Laptop,
  Compass,
  Info,
  ExternalLink,
  HelpCircle
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
          throw new Error(json.message || json.error || 'Report not found or unavailable.');
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
    const url = getPublicReportUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDetection = (val?: DetectionStatus | string) => {
    if (val === 'detected') {
      return (
        <span className="inline-flex items-center space-x-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
          <span>Detected</span>
        </span>
      );
    }
    if (val === 'not_detected') {
      return (
        <span className="inline-flex items-center space-x-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
          <span>Not detected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
        <span>Unknown</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Generating factual signal report...</p>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Normalized Section Variables
  const reportId = data.report_id || data.case_record?.report_id || token;
  const status = data.status || data.case_record?.status || 'active';
  const label = data.label || data.case_record?.label || 'Verification Case';
  const createdAt = data.created_at || data.case_record?.created_at;
  const verifiedAt = data.verified_at || data.case_record?.verified_at;
  const expiresAt = data.expires_at || data.case_record?.expires_at;

  const userProvided = data.user_provided_information || {};
  const recipientName = userProvided.recipient_name || data.recipient_name;
  const claimedLocation = userProvided.claimed_location || data.claimed_location;
  const purpose = userProvided.purpose || data.purpose;
  const userNotes = userProvided.user_notes || data.user_provided_notes || [];
  const transactionChecklist = userProvided.transaction_checklist || data.checklist?.transaction_checklist;

  const observedSignals = data.observed_connection_signals || data.connection;
  const locationComparison = data.location_comparison;
  const vpnProxy = data.vpn_proxy_indicators || {
    vpn_status: observedSignals?.vpn_status || 'unknown',
    proxy_status: observedSignals?.proxy_status || 'unknown',
    datacenter_status: observedSignals?.datacenter_status || 'unknown',
    vpn_explanation: observedSignals?.vpn_explanation,
    proxy_explanation: observedSignals?.proxy_explanation,
    datacenter_explanation: observedSignals?.datacenter_explanation,
    provider_name: observedSignals?.provider_name
  };

  const deviceEnv = data.device_browser_environment || {
    device_type: observedSignals?.device_type || 'Unavailable',
    os: observedSignals?.os || 'Unavailable',
    browser: observedSignals?.browser || 'Unavailable'
  };

  const publicProfile = data.public_profile_reference || {
    url: data.profile_url || data.profile_information?.profile_url,
    platform: data.profile_information?.platform,
    disclaimer: 'Supporting reference only. VerifyLink does not access private accounts, authenticated content, or passwords. Only publicly accessible web metadata is examined.'
  };

  const limitationsData = data.limitations_and_privacy || {
    mandatory_statement:
      data.disclaimer ||
      'VerifyLink provides factual information and signals for review. It does not determine whether a person is a scammer or criminal. Network location is approximate and does not prove physical presence. VPN/proxy detection relies on commercial databases and may produce false positives or false negatives. Public information may be incomplete.',
    limitations_list: observedSignals?.limitations || [
      'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.',
      'VPN and proxy detection relies on commercial databases and may produce false positives or false negatives.',
      'Technical signals are for informational review and do not constitute legal or fraud determinations.'
    ]
  };

  // Derive comparison text cleanly
  const comparisonResultText =
    locationComparison?.comparison_result ||
    (observedSignals?.location_comparison === 'consistent'
      ? 'Approximate regions are consistent.'
      : observedSignals?.location_comparison === 'differ'
      ? 'Approximate regions differ.'
      : 'Unable to compare.');

  const observedRegionDisplay =
    locationComparison?.observed_network_region ||
    (observedSignals
      ? `${observedSignals.city && observedSignals.city !== 'Unavailable' && observedSignals.city !== 'Unknown' ? observedSignals.city + ', ' : ''}${observedSignals.region && observedSignals.region !== 'Unavailable' && observedSignals.region !== 'Unknown' ? observedSignals.region + ', ' : ''}${observedSignals.country}`
      : 'Unavailable');

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 antialiased">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
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
                <strong>Status:</strong>{' '}
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

          {/* SECTION A. Case Record */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">A</span>
                <span>Case Record</span>
              </h2>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Administrative Record
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-base font-bold text-slate-900">{label}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-500 block text-[11px]">Verification ID / Token:</span>
                  <span className="font-mono text-slate-900 font-semibold">{reportId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Status:</span>
                  <span className="font-semibold text-slate-900 capitalize">{status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Created Date:</span>
                  <span className="text-slate-800">{createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Response Timestamp:</span>
                  <span className="text-slate-800">{verifiedAt ? new Date(verifiedAt).toLocaleString() : 'Pending or No response'}</span>
                </div>
                {recipientName && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Target Person / Nickname:</span>
                    <span className="text-slate-800 font-medium">{recipientName}</span>
                  </div>
                )}
                {purpose && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Verification Context:</span>
                    <span className="text-slate-800 font-medium">{purpose}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION B. User-Provided Information */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">B</span>
                <span>User-Provided Information</span>
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                Provided by User
              </span>
            </div>

            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-3">
              <div className="text-[11px] text-amber-900 italic font-medium">
                Notice: All items in this section were entered directly by the requester and have NOT been independently verified by VerifyLink.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-white rounded-lg border border-amber-200/60">
                  <span className="text-slate-500 block text-[11px]">Claimed Location:</span>
                  <span className="font-semibold text-slate-900">{claimedLocation || 'Not specified by requester'}</span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-200/60">
                  <span className="text-slate-500 block text-[11px]">Context / Purpose:</span>
                  <span className="font-semibold text-slate-900">{purpose || 'General verification'}</span>
                </div>
              </div>

              {/* Transaction Checklist Flags (User-provided) */}
              {transactionChecklist && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Requester Context Checklist (User-Provided Indicators)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-amber-200/60">
                    <div className="flex items-center space-x-2">
                      <span className={transactionChecklist.money_requested ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                        {transactionChecklist.money_requested ? '✓' : '○'}
                      </span>
                      <span className={transactionChecklist.money_requested ? 'font-medium text-slate-800' : 'text-slate-500'}>
                        Financial transfer or money requested
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={transactionChecklist.urgency_pressure_used ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                        {transactionChecklist.urgency_pressure_used ? '✓' : '○'}
                      </span>
                      <span className={transactionChecklist.urgency_pressure_used ? 'font-medium text-slate-800' : 'text-slate-500'}>
                        Urgency or pressure tactics noted
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={transactionChecklist.payment_details_matched ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                        {transactionChecklist.payment_details_matched ? '✓' : '○'}
                      </span>
                      <span className={transactionChecklist.payment_details_matched ? 'font-medium text-slate-800' : 'text-slate-500'}>
                        Payment details matched identity
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={transactionChecklist.additional_verification_refused ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                        {transactionChecklist.additional_verification_refused ? '✓' : '○'}
                      </span>
                      <span className={transactionChecklist.additional_verification_refused ? 'font-medium text-slate-800' : 'text-slate-500'}>
                        Refused other verification methods
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Case Notes */}
              {userNotes && userNotes.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Requester Case Notes
                  </span>
                  <div className="space-y-1.5">
                    {userNotes.map((n: any) => (
                      <div key={n.id} className="p-2.5 bg-white rounded-lg border border-amber-200/60 text-xs">
                        <p className="text-slate-800">{n.note}</p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Entered: {new Date(n.created_at).toLocaleString()} • Provided by User
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

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
                In strict compliance with VerifyLink voluntary consent protections, no connection or IP intelligence signals were collected or stored.
              </p>
            </div>
          )}

          {/* SECTION C. Observed Connection Signals */}
          {observedSignals && status !== 'declined' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">C</span>
                  <span>Observed Connection Signals</span>
                </h2>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Observed by VerifyLink
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Approximate Location</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {observedSignals.city && observedSignals.city !== 'Unavailable' && observedSignals.city !== 'Unknown'
                      ? `${observedSignals.city}, `
                      : ''}
                    {observedSignals.country}
                  </div>
                  <div className="text-[10px] text-slate-400">Network routing estimate only</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Network / ISP</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={observedSignals.network}>
                    {observedSignals.isp || observedSignals.network || 'Unavailable'}
                  </div>
                  <div className="text-[10px] text-slate-400">{observedSignals.asn || 'ASN unknown'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Connection Type</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {observedSignals.connection_type || 'Standard IP Routing'}
                  </div>
                  <div className="text-[10px] text-slate-400">Infrastructure type</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Masked IP Summary</div>
                  <div className="text-xs font-mono font-semibold text-slate-800 mt-1">
                    {observedSignals.ip_masked || observedSignals.ip_summary || '***.***.***'}
                  </div>
                  <div className="text-[10px] text-slate-400">Raw IP masked for privacy</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Observation Time</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {observedSignals.timestamp || observedSignals.created_at
                      ? new Date(observedSignals.timestamp || observedSignals.created_at).toLocaleString()
                      : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400">Recorded upon voluntary consent</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Intelligence Provider</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 truncate" title={vpnProxy.provider_name}>
                    {vpnProxy.provider_name || 'Standard Geo Routing'}
                  </div>
                  <div className="text-[10px] text-slate-400">Source provider</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
                Derived from public IP routing tables. Reflects network carrier infrastructure and is NOT GPS or proof of physical presence.
              </div>
            </section>
          )}

          {/* SECTION D. Location Comparison */}
          {observedSignals && status !== 'declined' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">D</span>
                  <span>Location Comparison</span>
                </h2>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Factual Comparison
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                      Claimed Location (User-Provided)
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {claimedLocation || 'Not specified by requester'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                      Observed Network Region (Independently Derived)
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {observedRegionDisplay}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-600 font-semibold">Comparison Result:</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    comparisonResultText === 'Approximate regions are consistent.'
                      ? 'bg-emerald-100 text-emerald-800'
                      : comparisonResultText === 'Approximate regions differ.'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {comparisonResultText}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Note: Network routing boundaries may differ from physical borders. Network location is an approximate estimate derived from IP routing tables and is NOT GPS or proof of physical presence.
                </p>
              </div>
            </section>
          )}

          {/* SECTION E. VPN/Proxy Indicators */}
          {observedSignals && status !== 'declined' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">E</span>
                  <span>VPN / Proxy Indicators</span>
                </h2>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Commercial Heuristics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Commercial VPN</div>
                  <div>{formatDetection(vpnProxy.vpn_status)}</div>
                  <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                    {vpnProxy.vpn_explanation || 'Commercial VPN signatures lookup.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Proxy Server</div>
                  <div>{formatDetection(vpnProxy.proxy_status)}</div>
                  <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                    {vpnProxy.proxy_explanation || 'Open proxy signatures lookup.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Datacenter / Hosting</div>
                  <div>{formatDetection(vpnProxy.datacenter_status)}</div>
                  <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                    {vpnProxy.datacenter_explanation || 'Hosting or cloud infrastructure IP.'}
                  </p>
                </div>
              </div>

              {vpnProxy.vpn_status === 'unknown' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">Explanation for Unknown Status:</span> VPN and proxy indicators are reported as Unknown because a commercial IP intelligence provider API key is not configured in this deployment. VerifyLink strictly does not fabricate detection statuses.
                  </div>
                </div>
              )}
            </section>
          )}

          {/* SECTION F. Device & Browser Environment */}
          {observedSignals && status !== 'declined' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">F</span>
                  <span>Device &amp; Browser Environment</span>
                </h2>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Observed Headers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Device Type:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{deviceEnv.device_type || 'Desktop'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Operating System:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{deviceEnv.os || 'Unavailable'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Browser:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{deviceEnv.browser || 'Unavailable'}</span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION G. Public Profile Reference */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center text-[10px] font-bold">G</span>
                <span>Public Profile Reference</span>
              </h2>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Supporting Reference Only
              </span>
            </div>

            {publicProfile.url ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500 font-semibold uppercase text-[11px]">Submitted URL:</span>
                  {publicProfile.platform && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                      Platform: {publicProfile.platform}
                    </span>
                  )}
                </div>
                <div className="font-mono text-slate-800 break-all p-2 bg-white rounded border border-slate-200">
                  {publicProfile.url}
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Supporting reference only. VerifyLink inspects only publicly accessible metadata. It does NOT access private accounts, authenticated content, or passwords.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                No public profile URL was submitted for this verification case.
              </div>
            )}
          </section>

          {/* SECTION H. Limitations & Privacy */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-700 text-white flex items-center justify-center text-[10px] font-bold">H</span>
                <span>Limitations &amp; Privacy</span>
              </h2>
              <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Mandatory Notice
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-700 leading-relaxed space-y-3">
              <div className="font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Core Verification Limitations</span>
              </div>

              <blockquote className="font-medium text-slate-900 p-3 bg-white rounded-lg border-l-4 border-amber-500 text-xs">
                “{limitationsData.mandatory_statement}”
              </blockquote>

              <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                <p>• <strong>Data Minimization:</strong> Raw IP addresses are masked and minimized. Only aggregated network-level facts are stored.</p>
                <p>• <strong>Voluntary Consent:</strong> Participation in verification is voluntary. Declining verification does not prove fraud.</p>
                <p>• <strong>Physical Presence:</strong> Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.</p>
                <p>• <strong>Signal Reliability:</strong> Commercial VPN and proxy detection heuristics may yield false positives or false negatives.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
