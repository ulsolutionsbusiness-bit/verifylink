import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import {
  FileSearch,
  X,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  Info,
  Shield,
  Clock,
  Radio
} from 'lucide-react';
import type { PublicProfileAnalysisResult, SignalEvidence } from '../types';

interface ProfileAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVerification?: () => void;
}

export const ProfileAnalyzerModal: React.FC<ProfileAnalyzerModalProps> = ({ isOpen, onClose, onCreateVerification }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicProfileAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiFetch('/api/profile/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze URL.');
      }

      setResult(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Error occurred while contacting profile analyzer.');
    } finally {
      setLoading(false);
    }
  };

  const getSignalBadge = (type: SignalEvidence['type']) => {
    switch (type) {
      case 'normal':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            Normal Signal
          </span>
        );
      case 'attention':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            Attention Signal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
            Information Unavailable
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-slate-200">
        <button
          id="analyzer-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSearch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analyze Public Profile</h2>
            <p className="text-xs text-slate-500">
              Extract and examine publicly visible metadata without bypassing platform security
            </p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Paste Public Profile URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="profile-url-input"
                type="text"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://facebook.com/seller or https://x.com/username"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <button
                id="profile-analyze-submit-btn"
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <FileSearch className="w-4 h-4" />
                <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Supports Facebook, Instagram, TikTok, X (Twitter), LinkedIn, personal domains, and public pages.
            </p>
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Analysis Error</p>
              <p className="text-xs mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-5 border-t border-slate-200 pt-5 animate-fadeIn">
            {/* Accessibility Banner */}
            {!result.accessible ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <div className="font-bold flex items-center space-x-2 text-amber-950 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Unable to verify public information from this URL.</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">{result.limitation}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
                <div className="font-bold flex items-center space-x-2 text-emerald-950 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Public Information Successfully Extracted</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Information retrieved from legitimate public metadata tags.
                </p>
              </div>
            )}

            {/* Extracted Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Platform / Domain</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {result.platform || 'Web Domain'} ({result.domain || 'N/A'})
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Publicly Stated Location</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {result.public_location || <span className="text-slate-400 font-normal">Not stated in public bio</span>}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Public Name / Title</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {result.public_name || <span className="text-slate-400 font-normal">No public title detected</span>}
                </div>
              </div>

              {result.public_description && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Public Bio / Description</div>
                  <div className="text-xs text-slate-700 mt-1 leading-relaxed">{result.public_description}</div>
                </div>
              )}
            </div>

            {/* Signals List */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>Extracted Signals</span>
              </h3>
              <div className="space-y-2">
                {result.signals.map((sig, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{sig.title}</span>
                      {getSignalBadge(sig.type)}
                    </div>
                    <p className="text-xs text-slate-600">{sig.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance boundary note */}
            <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 leading-normal">
              <strong>Data Boundary:</strong> VerifyLink extracts only unauthenticated public web tags. It never bypasses logins, CAPTCHAs, or platform security.
            </div>

            {onCreateVerification && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={onCreateVerification}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>+ Create Verification Request for this Profile</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
