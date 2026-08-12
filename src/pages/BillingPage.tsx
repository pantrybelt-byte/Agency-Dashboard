import React, { useState } from 'react';
import { CreditCard, Check, ShieldCheck, Sparkles, Download, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import type { AgencyUser, SubscriptionTier } from '../types';

interface BillingPageProps {
  user?: AgencyUser;
}

const tiers = [
  {
    id: 'community' as SubscriptionTier,
    name: 'Community Plan',
    tagline: 'Ideal for local single-county non-profits & county action committees',
    monthlyPrice: 400,
    annualPrice: 320, // 20% discount
    stripeMonthlyPriceId: 'price_community_monthly',
    stripeAnnualPriceId: 'price_community_annual',
    features: [
      '1 Assigned County Scope',
      'Up to 5 Active Partner Pantries',
      'Basic Age & Household Demographics',
      'Standard CSV Exports',
      'Community ZIP Code Metrics',
      'Email Support',
    ],
    highlight: false,
    badge: 'Tier 1',
  },
  {
    id: 'pro' as SubscriptionTier,
    name: 'Regional Pro Plan',
    tagline: 'For regional agencies like United Way & regional food bank hubs',
    monthlyPrice: 1500,
    annualPrice: 1200, // 20% discount ($14,400/yr)
    stripeMonthlyPriceId: 'price_pro_monthly',
    stripeAnnualPriceId: 'price_pro_annual',
    features: [
      'Up to 10 Assigned Counties Scope',
      '67-County Alabama SVG Vector Heatmap',
      'USDA Civil Rights Demographics Breakdown',
      'Automated Weekly & Monthly Email Report Scheduler',
      'Custom Threshold Alert Rule Builder',
      'Period Comparison Mode (Current vs Previous)',
      'Priority Agency Phone & Email Support',
    ],
    highlight: true,
    badge: 'Tier 2 · Most Popular',
  },
  {
    id: 'enterprise' as SubscriptionTier,
    name: 'Enterprise Impact Plan',
    tagline: 'For state departments (ADECA, USDA Regional, Feeding Alabama)',
    monthlyPrice: 5000,
    annualPrice: 4000, // 20% discount ($48,000/yr)
    stripeMonthlyPriceId: 'price_enterprise_monthly',
    stripeAnnualPriceId: 'price_enterprise_annual',
    features: [
      'All 67 Alabama Counties Statewide Live Feed',
      'Interactive GIS Location Marker Mapping',
      'Direct Firebase Firestore Live Data Feed API',
      'Multi-User SSO & Role-Based Access Control',
      'Custom Branded Grant PDF Templates',
      'Dedicated Grant & Data Analytics Specialist',
      '99.9% Uptime SLA & Invoicing / Purchase Order Option',
    ],
    highlight: false,
    badge: 'Tier 3 · State Level',
  },
];

const mockInvoices = [
  { id: 'INV-2026-008', date: 'Aug 1, 2026', amount: '$1,500.00', status: 'Paid', plan: 'Regional Pro Plan (Monthly)', pdf: 'invoice_aug_2026.pdf' },
  { id: 'INV-2026-007', date: 'Jul 1, 2026', amount: '$1,500.00', status: 'Paid', plan: 'Regional Pro Plan (Monthly)', pdf: 'invoice_jul_2026.pdf' },
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: '$1,500.00', status: 'Paid', plan: 'Regional Pro Plan (Monthly)', pdf: 'invoice_jun_2026.pdf' },
];

export const BillingPage: React.FC<BillingPageProps> = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('pro');
  const [stripeLoading, setStripeLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectTier = (tierId: SubscriptionTier, priceId: string) => {
    setStripeLoading(tierId);
    // Simulate Stripe Checkout Redirect
    setTimeout(() => {
      setStripeLoading(null);
      if (tierId === currentTier) {
        setToastMessage('Redirecting to Stripe Billing Portal to manage your existing subscription...');
      } else {
        setCurrentTier(tierId);
        setToastMessage(`Plan updated to ${tierId.toUpperCase()}! Stripe Checkout Session created for ${priceId}.`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  const handleOpenStripePortal = () => {
    setStripeLoading('portal');
    setTimeout(() => {
      setStripeLoading(null);
      setToastMessage('Redirecting to Stripe Customer Portal (manage cards, invoices, tax IDs)...');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1d2e] border border-emerald-500/30 shadow-2xl px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-[13px] text-white font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Agency Subscription & Billing</h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                Grant Eligible
              </span>
            </div>
            <p className="text-[12px] text-slate-300 mt-0.5">
              Manage agency tier, payment methods, and automated Stripe billing for United Way & USDA grant accounts.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenStripePortal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[12px] font-bold hover:bg-white/[0.1] transition-all cursor-pointer shadow-sm shrink-0 self-end md:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          Manage Stripe Portal
        </button>
      </div>

      {/* Current Active Plan Overview Card */}
      <div className="p-5 rounded-2xl bg-[#12141f] border border-white/[0.08] grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Active Subscription
          </span>
          <h3 className="text-xl font-extrabold text-white">Regional Pro Plan (Tier 2)</h3>
          <p className="text-[12px] text-slate-400">United Way River Region · Corporate Account</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5 text-left">
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-400">Assigned Counties Usage:</span>
            <span className="text-white font-bold">6 / 10 Counties</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '60%' }} />
          </div>
          <p className="text-[10px] text-slate-400">Next renewal: Sept 1, 2026 ($18,000 billed annually)</p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleOpenStripePortal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Stripe Portal Active
          </button>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-3 py-2">
        <span className={`text-[13px] font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
          Monthly Billing
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className="w-12 h-6 rounded-full bg-white/[0.1] border border-white/[0.15] p-0.5 transition-colors cursor-pointer relative"
        >
          <div
            className={`w-5 h-5 rounded-full bg-emerald-400 shadow-md transition-transform ${
              billingCycle === 'annual' ? 'transform translate-x-6' : ''
            }`}
          />
        </button>
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
            Annual Billing
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            Save 20%
          </span>
        </div>
      </div>

      {/* 3 Tier Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
          const isCurrent = currentTier === tier.id;
          const priceId = billingCycle === 'annual' ? tier.stripeAnnualPriceId : tier.stripeMonthlyPriceId;

          return (
            <div
              key={tier.id}
              className={`rounded-2xl p-6 border transition-all flex flex-col justify-between relative overflow-hidden ${
                tier.highlight
                  ? 'border-emerald-500/50 bg-[#141829] shadow-2xl ring-1 ring-emerald-500/30'
                  : 'border-white/[0.08] bg-[#12141f] hover:border-white/[0.15]'
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-md">
                  RECOMMENDED FOR AGENCIES
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  {tier.badge}
                </span>

                <h3 className="text-xl font-bold text-white mt-3">{tier.name}</h3>
                <p className="text-[12px] text-slate-400 mt-1 min-h-[36px]">{tier.tagline}</p>

                <div className="my-5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">${price.toLocaleString()}</span>
                  <span className="text-[12px] text-slate-400">/ month</span>
                  {billingCycle === 'annual' && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      (billed ${(price * 12).toLocaleString()}/yr)
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pt-4 border-t border-white/[0.06] text-[12px] text-slate-300">
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => handleSelectTier(tier.id, priceId)}
                  disabled={stripeLoading === tier.id}
                  className={`w-full py-3 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : tier.highlight
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08]'
                  }`}
                >
                  {stripeLoading === tier.id ? (
                    'Connecting Stripe Checkout...'
                  ) : isCurrent ? (
                    'Current Active Plan'
                  ) : (
                    <>
                      <span>Select {tier.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stripe Payment Method & Integration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Methods */}
        <ChartCard title="Payment Methods & Invoicing" subtitle="Stripe Customer Portal details">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 rounded bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                  VISA
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">Corporate Visa ending in 4242</p>
                  <p className="text-[11px] text-slate-400">United Way River Region · Expires 12/28</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Primary
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 rounded bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                  PO
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">Government Grant Purchase Order</p>
                  <p className="text-[11px] text-slate-400">USDA / State Grant Direct Invoicing (30-day terms)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <button
              onClick={handleOpenStripePortal}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:text-white text-[12px] font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Add Payment Method in Stripe Portal
            </button>
          </div>
        </ChartCard>

        {/* Developer Stripe Integration Readiness Card */}
        <ChartCard title="Stripe API Configuration" subtitle="Webhook & keys status for developer handoff">
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-white">Stripe Webhook Endpoint</p>
                  <p className="text-[11px] text-slate-300">Listening for customer.subscription.updated</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                READY
              </span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0f1117] border border-white/[0.06]">
                <span className="text-slate-400">VITE_STRIPE_PUBLISHABLE_KEY:</span>
                <span className="text-emerald-400">pk_live_51P...90X</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0f1117] border border-white/[0.06]">
                <span className="text-slate-400">STRIPE_WEBHOOK_SECRET:</span>
                <span className="text-indigo-400">whsec_89f...21a</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Invoice History */}
      <ChartCard title="Billing & Invoice History" subtitle="Download PDF receipts for grant auditing">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Invoice ID</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Date</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-left">Plan</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">Status</th>
                <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-[12px] text-emerald-400 font-semibold">{inv.id}</td>
                  <td className="py-3 px-3 text-[12px] text-slate-300">{inv.date}</td>
                  <td className="py-3 px-3 text-[12px] text-white font-medium">{inv.plan}</td>
                  <td className="py-3 px-3 text-[12px] text-white font-bold text-right">{inv.amount}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => alert(`Downloading Stripe Receipt PDF for ${inv.id}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Download PDF Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};
