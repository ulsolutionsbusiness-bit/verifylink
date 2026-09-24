import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { PricingPage } from './components/PricingPage';
import { SafetyGuide } from './components/SafetyGuide';
import { AdminDashboard } from './components/AdminDashboard';
import { RecipientVerification } from './components/RecipientVerification';
import { ShareableReport } from './components/ShareableReport';
import { AuthModal } from './components/AuthModal';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

function AppContent() {
  const { user, hasAccess, loading, refreshAuth } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [autoOpenCreate, setAutoOpenCreate] = useState<boolean>(false);
  const [autoOpenAnalyzer, setAutoOpenAnalyzer] = useState<boolean>(false);
  const [dashboardFilter, setDashboardFilter] = useState<string>('all');
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync initial view with path and user state
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Paystack callback parameter on return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    const paymentAction = urlParams.get('payment');

    if (reference || paymentAction === 'verify') {
      const verifyRef = reference || '';
      if (verifyRef) {
        apiFetch(`/api/subscriptions/verify-payment?reference=${encodeURIComponent(verifyRef)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setPaymentNotice({
                type: 'success',
                message: 'Your VerifyLink Pro subscription has been verified and activated!'
              });
              refreshAuth();
            } else {
              setPaymentNotice({
                type: 'error',
                message: data.message || 'Payment could not be verified automatically.'
              });
            }
          })
          .catch(() => {
            setPaymentNotice({
              type: 'error',
              message: 'Failed to verify payment reference.'
            });
          })
          .finally(() => {
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    }
  }, [refreshAuth]);

  // Adjust view when user signs in or out
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'owner' || user.role === 'admin') {
          // Owner and Admin are always directed to the dashboard (no pricing lock)
          if (currentView === 'landing' || currentView === 'pricing') {
            setCurrentView('dashboard');
          }
        } else if (currentView === 'landing') {
          if (!hasAccess) {
            setCurrentView('pricing');
          } else {
            setCurrentView('dashboard');
          }
        }
      } else {
        if (currentView === 'dashboard' || currentView === 'admin') {
          setCurrentView('landing');
        }
      }
    }
  }, [user, hasAccess, loading]);

  // Route 1: Recipient verification link /verify/:token (Public - No login required)
  const verifyMatch = currentPath.match(/^\/verify\/([^/]+)/);
  if (verifyMatch) {
    const token = verifyMatch[1];
    return <RecipientVerification token={token} />;
  }

  // Route 2: Public shareable report /report/:token (Public - No login required)
  const reportMatch = currentPath.match(/^\/report\/([^/]+)/);
  if (reportMatch) {
    const token = reportMatch[1];
    return (
      <ShareableReport
        token={token}
        onBack={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
          setCurrentView(user ? 'dashboard' : 'landing');
        }}
      />
    );
  }

  // Prevent routing flash during initial auth verification for dashboard/private views
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Initializing VerifyLink secure session...</span>
        </div>
      </div>
    );
  }

  const navigateTo = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const openPublicReport = (token: string) => {
    window.history.pushState({}, '', `/report/${token}`);
    setCurrentPath(`/report/${token}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => {
          if (view === 'create-verification') {
            setAutoOpenCreate(true);
            setAutoOpenAnalyzer(false);
            navigateTo('dashboard');
          } else if (view === 'analyze-profile') {
            setAutoOpenAnalyzer(true);
            setAutoOpenCreate(false);
            navigateTo('dashboard');
          } else if (view === 'my-cases') {
            setDashboardFilter('all');
            setAutoOpenCreate(false);
            setAutoOpenAnalyzer(false);
            navigateTo('dashboard');
          } else if (view === 'reports') {
            setDashboardFilter('completed');
            setAutoOpenCreate(false);
            setAutoOpenAnalyzer(false);
            navigateTo('dashboard');
          } else if (view === 'dashboard' && user && !hasAccess && user.role !== 'owner' && user.role !== 'admin') {
            navigateTo('pricing');
          } else {
            setAutoOpenCreate(false);
            setAutoOpenAnalyzer(false);
            navigateTo(view);
          }
        }}
        onOpenAuth={openAuth}
        onOpenCreateVerification={() => {
          setAutoOpenCreate(true);
          setAutoOpenAnalyzer(false);
          navigateTo('dashboard');
        }}
        onOpenAnalyzeProfile={() => {
          setAutoOpenAnalyzer(true);
          setAutoOpenCreate(false);
          navigateTo('dashboard');
        }}
      />

      {/* Payment Callback Notification Toast */}
      {paymentNotice && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm ${
              paymentNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              {paymentNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{paymentNotice.message}</span>
            </div>
            <button
              onClick={() => setPaymentNotice(null)}
              className="text-xs font-bold uppercase opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onGetStarted={() => {
              if (user) {
                if (hasAccess) {
                  setAutoOpenCreate(true);
                  navigateTo('dashboard');
                } else {
                  navigateTo('pricing');
                }
              } else {
                openAuth('signup');
              }
            }}
            onViewPricing={() => navigateTo('pricing')}
            onViewSafety={() => navigateTo('safety')}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            onNavigateToPricing={() => navigateTo('pricing')}
            onOpenPublicReport={openPublicReport}
            initialCreateOpen={autoOpenCreate}
            initialAnalyzerOpen={autoOpenAnalyzer}
            initialFilterStatus={dashboardFilter}
          />
        )}

        {currentView === 'pricing' && (
          <PricingPage
            onOpenAuth={openAuth}
            onNavigateToDashboard={() => {
              setAutoOpenCreate(true);
              navigateTo('dashboard');
            }}
          />
        )}

        {currentView === 'safety' && (
          <SafetyGuide
            onBack={() => navigateTo(user ? 'dashboard' : 'landing')}
          />
        )}

        {currentView === 'admin' && (user?.role === 'owner' || user?.role === 'admin') && (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-base">VerifyLink</span>
              <span className="text-[11px] text-slate-500">Connection & Signal Verification</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
              <button onClick={() => navigateTo('landing')} className="hover:text-blue-600">
                Overview
              </button>
              <button onClick={() => navigateTo('pricing')} className="hover:text-blue-600">
                Pricing & Plans
              </button>
              <button onClick={() => navigateTo('safety')} className="hover:text-blue-600">
                Fraud & Safety Advisory
              </button>
            </div>
          </div>

          {/* Legal / Ethical Notice Mandate */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1">Notice & Ethical Boundary</p>
            <p className="italic">
              «“VerifyLink is a verification and information tool. It does not determine whether a person is a scammer or criminal. Connection information can be approximate or inaccurate, VPN/proxy indicators can produce false positives, and publicly available information may be incomplete. Always consider multiple sources of evidence.”»
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              © {new Date().getFullYear()} VerifyLink Platform. All rights reserved. Data minimization compliant.
            </div>
            <div>
              Owner Contact: <span className="font-mono">ulsolutions.business@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          if (loggedUser?.role === 'owner' || loggedUser?.role === 'admin' || hasAccess) {
            navigateTo('dashboard');
          } else {
            navigateTo('pricing');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
