import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { RouteFallback } from '../ui/RouteFallback';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'Region-wide analytics & period comparison' },
  '/demographics': {
    title: 'Demographics & Community',
    subtitle: 'Age, household, and community ZIP breakdown',
  },
  '/food-deserts': {
    title: 'Food Deserts',
    subtitle: 'Food access analysis by county & census tract',
  },
  '/interactions': { title: 'Pantry Interactions', subtitle: 'App engagement and pantry activity' },
  '/most-requested': { title: 'Most Requested Items', subtitle: 'Item demand intelligence' },
  '/reports': { title: 'Reports & Export', subtitle: 'Generate and download reports' },
  '/billing': {
    title: 'Plan & Modules',
    subtitle: 'Base platform, purchased analytics modules, and invoicing',
  },
  '/modules/sdoh': {
    title: 'SDOH Health & Medicaid Audit',
    subtitle: 'Member ZIP vulnerability, HEDIS screening, closed-loop referrals',
  },
  '/modules/chna': {
    title: 'IRS CHNA Hospital Compliance',
    subtitle: 'Service radius assessment and Form 501(r) investment log',
  },
  '/modules/csr': {
    title: 'Corporate CSR Sponsor Overview',
    subtitle: 'Co-branded reach and sponsored county growth',
  },
  '/modules/disaster': {
    title: 'Disaster & Emergency Logistics',
    subtitle: 'Live POD status, stockout red zones, and the SOS stream',
  },
  '/settings': { title: 'Settings', subtitle: 'Agency account & threshold alert configuration' },
};

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { resolved } = useDashboardFilters();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageInfo = pageTitles[location.pathname] ?? { title: 'Dashboard', subtitle: '' };

  return (
    <div className="min-h-screen flex bg-[#0f1117] text-slate-100 relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-emerald-500 focus:text-white focus:font-semibold focus:text-[13px] focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSignOut={signOut}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          pageTitle={pageInfo.title}
          pageSubtitle={pageInfo.subtitle}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* `overflow-x-clip` is the backstop that keeps the page body from ever
            scrolling sideways on a phone. Wide content — tables, charts — gets
            its own `overflow-x-auto` container and still scrolls inside the
            card; what this prevents is one of them dragging the whole document
            with it. `clip` rather than `hidden` so the sticky header keeps
            working. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-x-clip p-5 sm:p-8 max-w-[1750px] w-full mx-auto"
        >
          {/* Paper-only masthead. The screen header is hidden when printing,
              so without this a printed report carries no provenance. */}
          <div className="print-header mb-6 pb-4 border-b border-slate-300">
            <p className="text-[16px] font-bold">AccessBelt Analytics — {pageInfo.title}</p>
            <p className="text-[11px]">
              {user?.organization ?? 'AccessBelt'} · Reporting period {resolved.label} · Generated{' '}
              {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
            </p>
            <p className="text-[11px]">
              Partnered with United Way River Region &amp; USDA · Demonstration data
            </p>
          </div>

          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="border-t border-white/[0.04] py-4 px-8 no-print">
          <div className="max-w-[1750px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">
              © 2026 AccessBelt Analytics · Demonstration data — live Firebase integration pending
            </p>
            <p className="text-[11px] text-slate-400">Partnered with United Way River Region &amp; USDA</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
