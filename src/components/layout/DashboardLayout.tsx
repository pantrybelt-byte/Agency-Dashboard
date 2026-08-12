import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { AgencyUser } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: AgencyUser;
  onSignOut: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'Region-wide analytics & period comparison' },
  '/demographics': { title: 'Demographics & Community', subtitle: 'Age, household, and community ZIP breakdown' },
  '/food-deserts': { title: 'Food Deserts', subtitle: 'Food access analysis by county & census tract' },
  '/interactions': { title: 'Pantry Interactions', subtitle: 'App engagement and pantry activity' },
  '/most-requested': { title: 'Most Requested Items', subtitle: 'Item demand intelligence' },
  '/reports': { title: 'Reports & Export', subtitle: 'Generate and download reports' },
  '/billing': { title: 'Billing & Subscription', subtitle: 'Manage agency plan, Stripe customer portal & invoices' },
  '/settings': { title: 'Settings', subtitle: 'Agency account & threshold alert configuration' },
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  onSignOut,
}) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageInfo = pageTitles[location.pathname] || { title: 'Dashboard', subtitle: '' };

  return (
    <div className="min-h-screen flex bg-[#0f1117] text-slate-100 relative">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSignOut={onSignOut}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          pageTitle={pageInfo.title}
          pageSubtitle={pageInfo.subtitle}
          user={user}
          onSignOut={onSignOut}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] py-4 px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-slate-600">
              © 2026 AccessBelt Analytics · Data refreshed real-time (Firebase Firestore Listener Ready)
            </p>
            <p className="text-[11px] text-slate-600">
              Partnered with United Way River Region & USDA
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
