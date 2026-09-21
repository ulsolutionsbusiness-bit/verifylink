import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Menu,
  X,
  CreditCard,
  User as UserIcon,
  LogOut,
  Sliders,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Plus,
  FileSearch,
  Briefcase,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { AccountModal } from './AccountModal';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenCreateVerification?: () => void;
  onOpenAnalyzeProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenCreateVerification,
  onOpenAnalyzeProfile
}) => {
  const { user, subscription, hasAccess, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'owner' || user.role === 'admin') {
      return (
        <span
          id="navbar-admin-owner-badge"
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
        >
          <ShieldCheck className="w-3 h-3 text-amber-700" />
          <span>Admin/Owner</span>
        </span>
      );
    }
    if (user.role === 'subscriber') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Active Pro
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Free Account
      </span>
    );
  };

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleCreateVerificationClick = () => {
    if (onOpenCreateVerification) {
      onOpenCreateVerification();
    } else {
      onNavigate('create-verification');
    }
    setMobileMenuOpen(false);
  };

  const handleAnalyzeProfileClick = () => {
    if (onOpenAnalyzeProfile) {
      onOpenAnalyzeProfile();
    } else {
      onNavigate('analyze-profile');
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div
              id="brand-logo-btn"
              onClick={() => handleNavClick(user ? 'dashboard' : 'landing')}
              className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0 mr-4"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-lg font-bold text-slate-900 tracking-tight">VerifyLink</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Signals
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden xl:block">Factual connection verification</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 text-xs xl:text-sm font-medium">
              {!user ? (
                <>
                  <button
                    id="nav-landing"
                    onClick={() => handleNavClick('landing')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'landing' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    id="nav-safety-guide"
                    onClick={() => handleNavClick('safety')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'safety' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Fraud &amp; Safety Guide
                  </button>
                  <button
                    id="nav-pricing-public"
                    onClick={() => handleNavClick('pricing')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'pricing' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Pricing / Subscription
                  </button>
                </>
              ) : (
                <>
                  {/* 1. Dashboard */}
                  <button
                    id="nav-dashboard"
                    onClick={() => handleNavClick('dashboard')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'dashboard' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Dashboard
                  </button>

                  {/* 2. Create Verification */}
                  <button
                    id="nav-create-verification"
                    onClick={handleCreateVerificationClick}
                    className="px-2.5 py-1.5 rounded-lg text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Create Verification</span>
                  </button>

                  {/* 3. My Cases */}
                  <button
                    id="nav-my-cases"
                    onClick={() => handleNavClick('my-cases')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'my-cases' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    My Cases
                  </button>

                  {/* 4. Analyze Public Profile */}
                  <button
                    id="nav-analyze-public-profile"
                    onClick={handleAnalyzeProfileClick}
                    className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-1 transition-colors"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-slate-500" />
                    <span>Analyze Public Profile</span>
                  </button>

                  {/* 5. Reports */}
                  <button
                    id="nav-reports"
                    onClick={() => handleNavClick('reports')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'reports' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Reports
                  </button>

                  {/* 6. Fraud & Safety Guide */}
                  <button
                    id="nav-fraud-safety-guide"
                    onClick={() => handleNavClick('safety')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'safety' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Fraud &amp; Safety Guide
                  </button>

                  {/* 7. Pricing / Subscription */}
                  <button
                    id="nav-pricing-sub"
                    onClick={() => handleNavClick('pricing')}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      currentView === 'pricing' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Pricing / Subscription
                  </button>

                  {/* Owner/Admin Console Shortcut */}
                  {(user.role === 'owner' || user.role === 'admin') && (
                    <button
                      id="nav-admin-console"
                      onClick={() => handleNavClick('admin')}
                      className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                        currentView === 'admin' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      Admin Console
                    </button>
                  )}
                </>
              )}
            </nav>

            {/* Desktop Right Actions: Account */}
            <div className="hidden lg:flex items-center space-x-3">
              {!user ? (
                <>
                  <button
                    id="login-btn"
                    onClick={() => onOpenAuth('login')}
                    className="px-3.5 py-2 text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    id="signup-btn"
                    onClick={() => onOpenAuth('signup')}
                    className="px-4 py-2 text-xs xl:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  {/* 8. Account Button */}
                  <button
                    id="nav-account-btn"
                    onClick={() => setAccountModalOpen(true)}
                    className="flex items-center space-x-2 p-1.5 pr-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-left"
                    title="View Account Details"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[100px]">
                          {user.name}
                        </span>
                        {getRoleBadge()}
                      </div>
                      <span className="text-[10px] text-slate-400">Account</span>
                    </div>
                  </button>

                  <button
                    id="nav-logout-btn"
                    onClick={logout}
                    title="Sign out"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu hamburger button */}
            <div className="flex lg:hidden items-center space-x-2">
              {user && getRoleBadge()}
              <button
                id="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-5 space-y-2 animate-fadeIn">
            {user ? (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge()}
                  </div>
                </div>

                {/* Mobile Links */}
                <div className="space-y-1 text-sm font-medium">
                  {/* Dashboard */}
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      currentView === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Dashboard
                  </button>

                  {/* Create Verification */}
                  <button
                    onClick={handleCreateVerificationClick}
                    className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create Verification</span>
                  </button>

                  {/* My Cases */}
                  <button
                    onClick={() => handleNavClick('my-cases')}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      currentView === 'my-cases' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    My Cases
                  </button>

                  {/* Analyze Public Profile */}
                  <button
                    onClick={handleAnalyzeProfileClick}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <FileSearch className="w-4 h-4 text-slate-500" />
                    <span>Analyze Public Profile</span>
                  </button>

                  {/* Reports */}
                  <button
                    onClick={() => handleNavClick('reports')}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      currentView === 'reports' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Reports
                  </button>

                  {/* Fraud & Safety Guide */}
                  <button
                    onClick={() => handleNavClick('safety')}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      currentView === 'safety' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Fraud &amp; Safety Guide
                  </button>

                  {/* Pricing / Subscription */}
                  <button
                    onClick={() => handleNavClick('pricing')}
                    className={`w-full text-left px-3 py-2 rounded-lg ${
                      currentView === 'pricing' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Pricing / Subscription
                  </button>

                  {/* Admin Console */}
                  {(user.role === 'owner' || user.role === 'admin') && (
                    <button
                      onClick={() => handleNavClick('admin')}
                      className={`w-full text-left px-3 py-2 rounded-lg ${
                        currentView === 'admin' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      Admin Console
                    </button>
                  )}

                  {/* Account */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAccountModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-slate-500" />
                      <span>Account</span>
                    </span>
                    <span className="text-xs text-slate-400 font-normal">View details</span>
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center space-x-2 pt-2 border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavClick('landing')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Overview
                </button>
                <button
                  onClick={() => handleNavClick('safety')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Fraud &amp; Safety Guide
                </button>
                <button
                  onClick={() => handleNavClick('pricing')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Pricing / Subscription
                </button>
                <div className="pt-3 border-t border-slate-200 flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="w-full py-2.5 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('signup');
                    }}
                    className="w-full py-2.5 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-xs"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Account Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onNavigateToPricing={() => onNavigate('pricing')}
      />
    </>
  );
};
