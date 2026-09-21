import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import {
  Link as LinkIcon,
  X,
  Copy,
  Check,
  Share2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Lock,
  Globe,
  MapPin,
  HelpCircle,
  FileText,
  User as UserIcon
} from 'lucide-react';
import type { VerificationRequest } from '../types';

interface CreateVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vreq: VerificationRequest) => void;
}

export const CreateVerificationModal: React.FC<CreateVerificationModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [claimedLocation, setClaimedLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expiresIn, setExpiresIn] = useState<number>(24 * 60 * 60); // default 24h
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<VerificationRequest | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/verifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName.trim() || undefined,
          profile_url: profileUrl.trim() || undefined,
          claimed_location: claimedLocation.trim() || undefined,
          purpose: purpose.trim() || undefined,
          notes: notes.trim() || undefined,
          expiresInSeconds: expiresIn
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to generate verification link.');
      }

      setCreatedRequest(data.verification);
      onCreated(data.verification);
    } catch (err: any) {
      setError(err.message || 'Could not create verification link.');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationUrl = (token: string) => {
    return `${window.location.origin}/verify/${token}`;
  };

  const handleCopy = () => {
    if (!createdRequest) return;
    const url = getVerificationUrl(createdRequest.token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!createdRequest) return;
    const url = getVerificationUrl(createdRequest.token);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VerifyLink Voluntary Verification',
          text: 'Please complete voluntary connection verification with VerifyLink:',
          url
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleResetAndClose = () => {
    setRecipientName('');
    setProfileUrl('');
    setClaimedLocation('');
    setPurpose('');
    setNotes('');
    setExpiresIn(24 * 60 * 60);
    setCreatedRequest(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto">
        <button
          id="create-modal-close-btn"
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Create Verification Request
            </h2>
            <p className="text-xs text-slate-500">
              Generate a temporary voluntary link to review factual connection signals
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!createdRequest ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* 1. Person's name / nickname (Optional) */}
            <div>
              <label
                htmlFor="create-recipient-name-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                1. Person's Name / Nickname <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="create-recipient-name-input"
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="e.g. Alex Johnson or @seller_99"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* 2. Public profile URL (Optional) */}
            <div>
              <label
                htmlFor="create-profile-url-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                2. Public Profile URL <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="create-profile-url-input"
                type="text"
                value={profileUrl}
                onChange={e => setProfileUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/... or marketplace profile"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Optional supporting reference. We only inspect publicly accessible metadata.
              </p>
            </div>

            {/* 3. Claimed location (Optional) */}
            <div>
              <label
                htmlFor="create-claimed-location-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                3. Claimed Location <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="create-claimed-location-input"
                  type="text"
                  value={claimedLocation}
                  onChange={e => setClaimedLocation(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria or London, UK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Will be transparently compared with the observed network connection region.
              </p>
            </div>

            {/* 4. What are you verifying? (Optional short text field) */}
            <div>
              <label
                htmlFor="create-purpose-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                4. What Are You Verifying? <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="create-purpose-input"
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. Electronics transaction, freelance contract, remote hire"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
              />
            </div>

            {/* 5. Verification link expiration (Options: 24 hours, 48 hours, 7 days) */}
            <div>
              <label
                htmlFor="create-expiration-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                5. Verification Link Expiration
              </label>
              <div className="relative">
                <select
                  id="create-expiration-select"
                  value={expiresIn}
                  onChange={e => setExpiresIn(Number(e.target.value))}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer pr-10"
                >
                  <option value={24 * 60 * 60}>24 hours (Default)</option>
                  <option value={48 * 60 * 60}>48 hours</option>
                  <option value={7 * 24 * 60 * 60}>7 days</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* 6. User-provided notes (Optional) */}
            <div>
              <label
                htmlFor="create-notes-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                6. User-Provided Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id="create-notes-input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private context or notes for your case records..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Saved privately in your case workspace. Never shared with the recipient.
              </p>
            </div>

            {/* Privacy reminder */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Voluntary &amp; Transparent:</strong> The recipient does not need an account. They can choose to verify or decline. No passwords or private profiles will be requested.
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="create-verification-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Generating Link...' : 'Create Verification Link'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation View After Link Creation */
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Verification Link Created
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  Send this link to the person. They will review voluntary disclosures and verify their connection without needing to register.
                </p>
              </div>
            </div>

            {/* Generated Link & Copy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="generated-link-display-input"
                  type="text"
                  readOnly
                  value={getVerificationUrl(createdRequest.token)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 text-slate-900 select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  id="copy-verification-link-btn"
                  type="button"
                  onClick={handleCopy}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Case Details Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Verification ID:</span>
                <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {createdRequest.token}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Expiration Time:</span>
                <span className="flex items-center space-x-1 text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{new Date(createdRequest.expires_at).toLocaleString()}</span>
                </span>
              </div>
              {createdRequest.recipient_name && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-700">Person / Nickname:</span>
                  <span className="font-medium text-slate-900">{createdRequest.recipient_name}</span>
                </div>
              )}
              {createdRequest.claimed_location && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-700">Claimed Location:</span>
                  <span className="font-medium text-slate-900">{createdRequest.claimed_location}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedRequest(null);
                  setRecipientName('');
                  setProfileUrl('');
                  setClaimedLocation('');
                  setPurpose('');
                  setNotes('');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                View in Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
