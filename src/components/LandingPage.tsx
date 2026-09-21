import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileSearch,
  Globe,
  Lock,
  ArrowRight,
  HelpCircle,
  Clock,
  EyeOff
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewPricing: () => void;
  onViewSafety: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onViewPricing, onViewSafety }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold mb-6">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Independent Connection & Profile Verification</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Check the signals before you <span className="text-blue-600">trust the story</span>.
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            VerifyLink helps individuals and businesses verify voluntary connection signals, approximate network location, VPN indicators, and publicly accessible profile details when interacting online.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="hero-get-started"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="hero-view-pricing"
              onClick={onViewPricing}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-base border border-slate-300 transition-all"
            >
              View Pricing
            </button>
          </div>

          {/* Factual Signal Principle Card */}
          <div className="mt-10 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-2xl mx-auto text-left flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-700 leading-normal">
              <strong className="font-semibold text-slate-900">Signals, not accusations:</strong> VerifyLink produces factual connection indicators (such as network ASN, detected VPNs, and stated vs. observed region). We do not manufacture arbitrary numerical "scam scores" or make subjective accusations.
            </div>
          </div>
        </div>
      </section>

      {/* What VerifyLink Helps You Evaluate */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">What VerifyLink Evaluates</h2>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Transparently gather verifiable indicators without intrusive tracking or manufactured assertions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Approximate Location</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Discovers the country, region, and city associated with the connecting network. Described strictly as approximate routing—never claiming exact physical GPS coordinates.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">VPN, Proxy & Datacenter</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Evaluates whether the connection routes through known commercial VPN endpoints, anonymous web proxies, or hosting datacenters. Recorded as Unknown if data is unavailable.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Location Inconsistencies</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Compares a contact's publicly stated or self-reported location against their network origin, highlighting discrepancies as objective factual signals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Public Profile Analysis</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Safely inspects legitimately accessible public profile information and metadata from social networks and web domains without bypassing platform security or passwords.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Verification Responses</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tracks whether the recipient completed or declined voluntary verification. When declined, VerifyLink clearly notes that a decline does not prove fraud.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Strict Data Minimization</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Raw IP addresses are never permanently retained. No browser fingerprinting, no hidden tracking pixels, and full case record deletion on demand.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works (6 Steps) */}
      <section className="bg-white border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              A transparent 6-step workflow respecting privacy and informed consent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Create an Account',
                desc: 'Sign up with your email and password to access your secure verification dashboard.'
              },
              {
                step: '2',
                title: 'Subscribe',
                desc: 'Activate VerifyLink Pro via Paystack (owners and administrators receive permanent free access).'
              },
              {
                step: '3',
                title: 'Enter Profile URL & Generate Link',
                desc: 'Paste the public profile URL and generate a secure, temporary verification link with customizable expiration.'
              },
              {
                step: '4',
                title: 'Send to the Person',
                desc: 'Share the link via chat, marketplace message, or email with the person you are communicating with.'
              },
              {
                step: '5',
                title: 'Voluntary Consent',
                desc: 'The recipient views clear privacy disclosures and voluntarily chooses to continue or decline.'
              },
              {
                step: '6',
                title: 'Review Evidence',
                desc: 'Examine factual indicators in your dashboard, download a shareable report, and document notes.'
              }
            ].map(item => (
              <div key={item.step} className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button
              id="steps-get-started-btn"
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all inline-flex items-center space-x-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Examples of Signals vs Claims */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">Distinguishing Signals from Proof</h2>
          <p className="mt-2 text-slate-600 text-sm">
            VerifyLink provides factual evidence instead of sensational conclusions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-rose-50 border border-rose-200">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
              <span>Statements VerifyLink Never Makes</span>
            </div>
            <ul className="space-y-2 text-sm text-rose-900">
              <li className="line-through">“This person is a scammer”</li>
              <li className="line-through">“100% fraud guaranteed”</li>
              <li className="line-through">“Confirmed scammer profile”</li>
              <li className="line-through">“80% mathematical chance of fraud”</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              <span>Factual Indicators VerifyLink Reports</span>
            </div>
            <ul className="space-y-2 text-sm text-emerald-900">
              <li>✓ “VPN detected”</li>
              <li>✓ “Location differs from stated location”</li>
              <li>✓ “Verification declined by recipient”</li>
              <li>✓ “Multiple unusual network signals detected”</li>
              <li>✓ “Insufficient public information available”</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Legal & Safety Disclaimer Section */}
      <section className="bg-slate-100 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Legal & Safety Notice</span>
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              «“VerifyLink is a verification and information tool. It does not determine whether a person is a scammer or criminal. Connection information can be approximate or inaccurate, VPN/proxy indicators can produce false positives, and publicly available information may be incomplete. Always consider multiple sources of evidence.”»
            </p>
          </div>

          {/* Suspected Fraud Quick Box */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-blue-900 text-base">If You Believe You Are Being Defrauded</h4>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                Practical steps to protect your finances, preserve records, and contact appropriate authorities.
              </p>
            </div>
            <button
              id="landing-view-fraud-guide"
              onClick={onViewSafety}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shrink-0"
            >
              Read Fraud Guide
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
