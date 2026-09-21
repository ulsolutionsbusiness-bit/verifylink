import React from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

interface SafetyGuideProps {
  onBack: () => void;
}

export const SafetyGuide: React.FC<SafetyGuideProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        id="safety-back-btn"
        onClick={onBack}
        className="mb-6 inline-flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-3 border border-rose-200">
            <ShieldAlert className="w-4 h-4" />
            <span>Fraud Advisory & Action Steps</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            What to Do If You Suspect Fraud
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            If an online interaction seems suspicious, unusual, or inconsistent with stated facts, follow these standard security precautions immediately.
          </p>
        </div>

        {/* Immediate Action Checklist */}
        <div className="p-6 bg-rose-50 rounded-xl border border-rose-200">
          <h2 className="text-lg font-bold text-rose-950 flex items-center space-x-2 mb-4">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            <span>If you believe you are being defrauded</span>
          </h2>
          <div className="space-y-3.5">
            {[
              {
                title: '1. Stop sending additional money',
                desc: 'Do not make further transfers, fees, “customs clearance” charges, insurance deposits, or cryptocurrency payments, regardless of pressure or promises.'
              },
              {
                title: '2. Preserve all evidence',
                desc: 'Take full-screen screenshots of conversation threads, profile pages, wire details, email headers, invoices, and transaction receipts immediately before accounts can be deleted.'
              },
              {
                title: '3. Contact your financial institution promptly',
                desc: 'Call your bank, card issuer, or payment processor (e.g. mobile money, wire provider) to dispute charges, freeze compromised cards, or recall pending transactions.'
              },
              {
                title: '4. Report the profile on the platform',
                desc: 'Flag the user profile or seller listing on the marketplace or social network (e.g. Facebook, Instagram, TikTok, LinkedIn, or classifieds).'
              },
              {
                title: '5. Contact appropriate law enforcement or cybercrime authorities',
                desc: 'File a formal report with national cybercrime agencies (e.g., EFCC in Nigeria, IC3 / FBI in the US, Action Fraud in the UK) with your documented transaction timeline.'
              }
            ].map(item => (
              <div key={item.title} className="flex items-start space-x-3 bg-white p-3.5 rounded-lg border border-rose-100">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What VerifyLink Is and Is Not */}
        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Important Notice: VerifyLink Scope</h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-2">
            <p>
              VerifyLink is a private connection and profile verification utility designed to surface objective network and public profile signals.
            </p>
            <p className="font-semibold text-slate-900">
              VerifyLink is NOT a law-enforcement agency, court, or investigative bureau, and does NOT possess police or regulatory authority.
            </p>
            <p className="italic text-xs text-slate-500 pt-2 border-t border-slate-200">
              «“VerifyLink is a verification and information tool. It does not determine whether a person is a scammer or criminal. Connection information can be approximate or inaccurate, VPN/proxy indicators can produce false positives, and publicly available information may be incomplete. Always consider multiple sources of evidence.”»
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
