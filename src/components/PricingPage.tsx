import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface PricingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigateToDashboard?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onOpenAuth, onNavigateToDashboard }) => {
  const { user, subscription, hasAccess, refreshAuth } = useAuth();
  const [planConfig, setPlanConfig] = useState({
    price_kobo: 500000,
    currency: 'NGN',
    name: 'VerifyLink Pro'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await apiFetch('/api/subscriptions/plan');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setPlanConfig({
            price_kobo: data.price_kobo || (data.price_ngn ? data.price_ngn * 100 : 500000),
            currency: data.currency || 'NGN',
            name: data.name || data.plan_name || 'VerifyLink Pro'
          });
        }
      } catch (err) {
        console.error('Failed to load plan details:', err);
      }
    }
    loadPlan();
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      onOpenAuth('signup');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await apiFetch('/api/subscriptions/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl: `${window.location.origin}?payment=verify`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to initialize subscription');
      }

      if (data.authorization_url) {
        // If Paystack returns external checkout URL
        window.location.href = data.authorization_url;
      } else if (data.demoActivated) {
        setSuccessMessage('VerifyLink Pro subscription activated! Redirecting to dashboard...');
        await refreshAuth();
        setTimeout(() => {
          onNavigateToDashboard?.();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Payment initialization error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your active subscription?')) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Subscription successfully canceled.');
        await refreshAuth();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription.');
      }
    } catch (err: any) {
      setError(err.message || 'Cancellation error.');
    } finally {
      setLoading(false);
    }
  };

  const formattedPrice = (planConfig.price_kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: planConfig.currency
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200">
          <Zap className="w-3.5 h-3.5" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Verify with Confidence
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          Subscribe to VerifyLink Pro to create connection verification links, inspect public profiles, and generate documented case reports.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-xl mx-auto flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Subscription Issue</p>
            <p className="text-xs mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm max-w-xl mx-auto flex items-start space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-xs mt-0.5 text-emerald-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Plan Card */}
      <div className="max-w-lg mx-auto bg-white rounded-2xl border-2 border-blue-600 shadow-lg p-6 sm:p-8 relative">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-xs">
          Recommended Plan
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{planConfig.name}</h2>
            <p className="text-xs text-slate-500">Monthly subscription for independent verification</p>
          </div>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{formattedPrice}</span>
            <span className="text-xs text-slate-500 block">/ month</span>
          </div>
        </div>

        {/* Current status if logged in */}
        {user && (
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-semibold text-slate-700">Account Access Status:</div>
            <div className="mt-1">
              {user.role === 'owner' && (
                <span className="font-bold text-indigo-700">Owner: Permanent Free Access</span>
              )}
              {user.role === 'admin' && (
                <span className="font-bold text-purple-700">Administrator: Permanent Free Access</span>
              )}
              {user.role === 'subscriber' && subscription?.status === 'active' && (
                <span className="font-bold text-emerald-700">
                  Active Subscriber (Current period ends: {new Date(subscription.expiry_date).toLocaleDateString()})
                </span>
              )}
              {user.role === 'user' && (
                <span className="text-slate-600">Free Tier (No active verification subscription)</span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6 text-xs sm:text-sm text-slate-700">
          {[
            'Unlimited connection verification links',
            'Customizable expiration (30m, 1h, 24h, 7d)',
            'Public social & domain profile analysis',
            'Factual evidence signals (VPN, Proxy, Datacenter, Region)',
            'Interactive transaction checklists',
            'Private encrypted case notes',
            'Downloadable and shareable verification reports',
            'Strict data minimization: zero raw IP retention'
          ].map((feature, i) => (
            <div key={i} className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        {user?.role === 'owner' || user?.role === 'admin' ? (
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl text-center text-xs font-semibold border border-indigo-200">
              You hold an elevated administrative role with permanent free access enabled.
            </div>
            {onNavigateToDashboard && (
              <button
                id="pricing-admin-goto-dash-btn"
                onClick={onNavigateToDashboard}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard &amp; Create Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : hasAccess ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-semibold border border-emerald-200 flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Your subscription is active and in good standing.</span>
            </div>
            {onNavigateToDashboard && (
              <button
                id="pricing-goto-dash-btn"
                onClick={onNavigateToDashboard}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard &amp; Create Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              id="cancel-sub-btn"
              onClick={handleCancelSubscription}
              disabled={loading}
              className="w-full py-2 px-4 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors text-center"
            >
              Cancel subscription
            </button>
          </div>
        ) : (
          <button
            id="subscribe-paystack-btn"
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>{loading ? 'Initializing Payment...' : 'Subscribe with Paystack'}</span>
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Secured with 256-bit encryption</span>
          <span>Powered by Paystack</span>
        </div>
      </div>
    </div>
  );
};
