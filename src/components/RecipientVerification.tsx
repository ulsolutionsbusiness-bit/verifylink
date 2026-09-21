import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Globe,
  Radio,
  EyeOff,
  Navigation
} from 'lucide-react';

interface RecipientVerificationProps {
  token: string;
}

export const RecipientVerification: React.FC<RecipientVerificationProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [requestInfo, setRequestInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<'pending' | 'completed' | 'declined'>('pending');
  const [submitting, setSubmitting] = useState(false);

  // Optional stated location for recipient to confirm if they wish
  const [statedLocation, setStatedLocation] = useState('');

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true);
        const res = await fetch(`/api/verify/info/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Invalid or expired verification link.');
        }

        setRequestInfo(data);
        if (data.is_completed) {
          setActionState('completed');
        } else if (data.is_declined) {
          setActionState('declined');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load verification details.');
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, [token]);

  const handleConsent = async (consent: boolean) => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/verify/consent/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent,
          statedLocation: statedLocation.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process verification response.');
      }

      if (consent) {
        setActionState('completed');
      } else {
        setActionState('declined');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Loading voluntary verification request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden my-4">
        {/* Brand Header */}
        <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">VerifyLink</h1>
              <p className="text-xs text-slate-500">Voluntary Connection Verification</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            No account required
          </span>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to proceed</p>
                <p className="text-xs mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {requestInfo?.is_expired && actionState === 'pending' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Link Expired</p>
                <p className="text-xs mt-0.5 text-amber-700">
                  This temporary verification link has expired and can no longer be processed.
                </p>
              </div>
            </div>
          )}

          {actionState === 'completed' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verification Completed</h2>
              <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
                Thank you. Your connection signals have been processed and recorded factually.
              </p>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-left mt-4 space-y-1">
                <p className="font-medium text-slate-700">What was observed:</p>
                <p>• Approximate network region &amp; operator</p>
                <p>• VPN / Proxy status indicators</p>
                <p>• Device &amp; browser environment</p>
              </div>
              <div className="pt-4 text-xs text-slate-400">
                You may safely close this browser window.
              </div>
            </div>
          )}

          {actionState === 'declined' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verification Declined</h2>
              <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
                You have chosen not to continue with voluntary connection verification. Your response has been recorded.
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left mt-4 space-y-1">
                <p className="font-bold text-slate-800">Privacy Notice:</p>
                <p className="italic">
                  Declining this voluntary verification does not imply wrongdoing or proof of fraud. No connection signals were analyzed.
                </p>
              </div>
              <div className="pt-4 text-xs text-slate-400">
                You may safely close this browser window.
              </div>
            </div>
          )}

          {actionState === 'pending' && !requestInfo?.is_expired && !error && (
            <>
              {/* Introduction & Disclosures */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-800 text-sm leading-relaxed">
                  <p className="font-semibold text-blue-950 mb-1">Voluntary Verification Request</p>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Someone you are interacting with has requested voluntary connection verification through VerifyLink to confirm basic factual connection signals before proceeding.
                  </p>
                </div>

                {/* Key Disclosures List */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Disclosures &amp; Protections
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Radio className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Observed Signals:</span> Approximate network region, country, network operator (ISP), connection type, VPN/proxy indicators, and device environment.
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">No Account or Passwords:</span> You do not need to create an account. No passwords, personal credentials, or private accounts are accessed.
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">No Geolocation/GPS:</span> Precise GPS location is never accessed unless you separately choose to grant it.
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <EyeOff className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">No Fraud Accusations:</span> VerifyLink provides factual signals only. It does not accuse anyone of fraud or make criminal determinations.
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Stated Location */}
              <div>
                <label
                  htmlFor="recipient-stated-location-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Optional: State Your Current City / Country
                </label>
                <input
                  id="recipient-stated-location-input"
                  type="text"
                  value={statedLocation}
                  onChange={e => setStatedLocation(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria or London, UK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If provided, this is compared transparently against your connection network region.
                </p>
              </div>

              {/* Action Buttons: Exact "I Agree & Verify" and "Decline" */}
              <div className="space-y-2.5 pt-2">
                <button
                  id="recipient-agree-verify-btn"
                  onClick={() => handleConsent(true)}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Verifying Connection Signals...' : 'I Agree & Verify'}</span>
                </button>

                <button
                  id="recipient-decline-btn"
                  onClick={() => handleConsent(false)}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-300 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>

              <div className="text-center pt-1">
                <p className="text-[11px] text-slate-400">
                  VerifyLink Data Minimization • Raw IP addresses are masked for privacy
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
