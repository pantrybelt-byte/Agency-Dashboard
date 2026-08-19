import React, { useState } from 'react';
import { CreditCard, Download, Zap, ArrowRight, ExternalLink, FileText, Landmark, Building2, Mail, Webhook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChartCard } from '../components/ui/ChartCard';
import { EntitlementBadge } from '../components/ui/StatusBadge';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import {
  ACCENTS,
  BASE_PLATFORM,
  VIEW_PRESETS,
  formatPriceBand,
  type ViewPreset,
} from '../config/presets';
import { usePreset } from '../hooks/usePreset';
import type { AgencyUser } from '../types';

interface BillingPageProps {
  user?: AgencyUser;
}


const mockInvoices = [
  { id: 'INV-2026-008', date: 'Aug 1, 2026', amount: '$400.00', status: 'Paid', plan: 'Base platform — monthly', pdf: 'invoice_aug_2026.pdf' },
  { id: 'INV-2026-007', date: 'Jul 1, 2026', amount: '$400.00', status: 'Paid', plan: 'Base platform — monthly', pdf: 'invoice_jul_2026.pdf' },
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: '$8,500.00', status: 'Paid', plan: 'Corporate CSR module — annual contract', pdf: 'invoice_jun_2026.pdf' },
];

export const BillingPage: React.FC<BillingPageProps> = () => {
  const { isUnlocked } = usePreset();
  const [upgradeTarget, setUpgradeTarget] = useState<ViewPreset | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenStripePortal = () => {
    setPortalBusy(true);
    setTimeout(() => {
      setPortalBusy(false);
      setToastMessage('Redirecting to Stripe Customer Portal (manage cards, invoices, tax IDs)...');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="card-glass fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 animate-fade-in-up">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-[13px] text-white font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Top Banner */}
      <div className="card-accent card text-emerald-400 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <CreditCard className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-white tracking-tight">Agency subscription &amp; billing</h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                Grant Eligible
              </span>
            </div>
            <p className="text-[12px] text-slate-300 mt-0.5">
              Two ways to pay: purchase order with Net-30 terms, or self-service card subscription.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenStripePortal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[12px] font-bold hover:bg-white/[0.1] transition-all cursor-pointer shadow-sm shrink-0 self-end md:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          {portalBusy ? 'Opening portal…' : 'Manage Stripe Portal'}
        </button>
      </div>

      {/* Procurement route — a county EMA or hospital system cannot pay by
          card. Purchase order, W-9 and ACH is the only path their finance
          office will accept, so it leads rather than sitting in a footnote. */}
      <section
        aria-labelledby="procurement-heading"
        className="card border-emerald-500/25 p-5"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <Landmark className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="procurement-heading" className="text-[15px] font-bold tracking-tight text-white">
                  QuickBooks Net-30 &amp; W-9 vendor support
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                  Grant eligible
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-300">
                Non-profits, hospital systems and government agencies can request a formal purchase
                order invoice on Net-30 terms, paid by ACH bank deposit. We provide a signed W-9 and
                vendor registration packet for your finance office.
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[11px] sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Payment terms</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-white">Net-30</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Method</dt>
                  <dd className="mt-0.5 font-semibold text-white">ACH deposit</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Tax ID (W-9)</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-white">On request</dd>
                </div>
                <div>
                  <dt className="text-slate-400">PO minimum</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-white">$2,500</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => setToastMessage('Purchase order request sent. Our team will email your invoice and W-9 within one business day.')}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-bold text-[#04140d] transition-colors hover:bg-emerald-400 cursor-pointer"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Request PO invoice
            </button>
            <button
              type="button"
              onClick={() => setToastMessage('W-9 and vendor registration packet sent to your billing contact.')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download W-9
            </button>
            <a
              href="mailto:accounts@accessbelt.org"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-slate-400 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact accounts team
            </a>
          </div>
        </div>

        <p className="mt-5 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-[11px] text-slate-400">
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Smaller agencies can skip procurement entirely and subscribe by card below, from
          <span className="font-mono text-slate-300">&nbsp;$400&nbsp;</span>to
          <span className="font-mono text-slate-300">&nbsp;$500&nbsp;</span>per month.
        </p>
      </section>

      {/* Base platform */}
      <section aria-labelledby="base-plan-heading" className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Active
            </span>
            <h2 id="base-plan-heading" className="mt-2 text-lg font-bold tracking-tight text-white">
              {BASE_PLATFORM.name}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-300">{BASE_PLATFORM.includes}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-bold tabular-nums text-white">
              ${BASE_PLATFORM.monthlyPrice}
            </p>
            <p className="text-[11px] text-slate-400">
              per month · ${BASE_PLATFORM.annualPrice.toLocaleString()}/yr billed annually
            </p>
          </div>
        </div>
      </section>

      {/* Module catalogue */}
      <section aria-labelledby="modules-heading" className="space-y-4">
        <div>
          <h2 id="modules-heading" className="text-lg font-bold tracking-tight text-white">
            Analytics modules
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-300">
            Purchased individually and priced by contract. Each unlocks a dedicated view and its
            own export.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {VIEW_PRESETS.filter((preset) => preset.access === 'add-on').map((preset) => {
            const owned = isUnlocked(preset.id);
            const accent = ACCENTS[preset.accent];
            const Icon = preset.icon;

            return (
              <article
                key={preset.id}
                className={`card card-hover flex flex-col p-5 ${owned ? accent.border : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent.border} ${accent.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${accent.text}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-white">{preset.name}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-400">{preset.buyer}</p>
                    </div>
                  </div>
                  <EntitlementBadge locked={!owned} variant="purchased" />
                </div>

                <p className="mt-3 flex-1 text-[12px] leading-relaxed text-slate-300">
                  {preset.summary}
                </p>

                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {preset.focus.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                  <p className="font-mono text-[13px] font-semibold text-white">
                    {formatPriceBand(preset)}
                  </p>

                  {owned ? (
                    <Link
                      to={`/modules/${preset.id}`}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      Open module
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUpgradeTarget(preset)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-[12px] font-bold text-[#180f00] transition-colors hover:bg-amber-400 cursor-pointer"
                    >
                      Request pricing
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <UpgradeModal preset={upgradeTarget} onClose={() => setUpgradeTarget(null)} />

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
                  <p className="text-[13px] font-bold text-white">Government grant purchase order</p>
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
                <Webhook className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
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
                      onClick={() => setToastMessage(`Receipt ${inv.id} is downloading.`)}
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
