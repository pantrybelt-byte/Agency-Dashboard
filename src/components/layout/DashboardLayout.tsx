import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';
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
  '/settings': { title: 'Settings', subtitle: 'Agency account & threshold alert configuration' },
};

export const DashboardLayout = () => {
  const location = useLocation();
  const { signOut } = useAuth();
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

        <main id="main-content" tabIndex={-1} className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="border-t border-white/[0.04] py-4 px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
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
