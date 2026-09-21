import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Crown, CreditCard, Mail, User as UserIcon, LogOut, X, CheckCircle2 } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPricing
}) => {
  const { user, subscription, hasAccess, logout } = useAuth();

  if (!isOpen || !user) return null;

  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
          </div>
          <button
            id="account-modal-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* User Profile Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profile Details</span>
              {(isOwner || isAdmin) ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Admin/Owner</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  {user.role}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-600 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          {/* Role & Privileges */}
          {isOwner && (
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-amber-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Crown className="w-4 h-4" />
                <span>Platform Owner Privileges</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Owner account retains lifetime unrestricted access across all verification tools, administrative functions, audit controls, and subscriber management.
              </p>
            </div>
          )}

          {isAdmin && !isOwner && (
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-purple-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Administrator Privileges</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Administrator account with full verification features and administrative access.
              </p>
            </div>
          )}

          {/* Subscription Status */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                hasAccess
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {isOwner ? 'Lifetime Active' : hasAccess ? 'Active Pro' : 'Free Tier'}
              </span>
            </div>

            <div className="text-xs text-slate-600">
              {isOwner ? (
                <span>No recurring charges required. Owner account is permanently active.</span>
              ) : hasAccess ? (
                <span>Pro plan active. Full access to connection verification, intelligence signals, and case reports.</span>
              ) : (
                <div className="space-y-2 pt-1">
                  <p>Upgrade to VerifyLink Pro for unlimited voluntary connection verification requests.</p>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToPricing();
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                  >
                    View Subscription Plans →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            id="account-modal-logout-btn"
            onClick={() => {
              onClose();
              logout();
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
