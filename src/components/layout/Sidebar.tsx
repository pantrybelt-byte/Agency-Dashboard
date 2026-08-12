import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  MousePointerClick,
  Users,
  ShoppingBasket,
  FileBarChart2,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}) => {
  const analyticsNav = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Demographics', path: '/demographics', icon: Users },
    { label: 'Food Deserts', path: '/food-deserts', icon: Map },
    { label: 'Pantry Interactions', path: '/interactions', icon: MousePointerClick },
  ];

  const insightsNav = [
    { label: 'Most Requested', path: '/most-requested', icon: ShoppingBasket },
  ];

  const reportsNav = [
    { label: 'Reports & Export', path: '/reports', icon: FileBarChart2 },
  ];

  const settingsNav = [
    { label: 'Billing & Subscription', path: '/billing', icon: CreditCard },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative
    ${isActive
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
    }
  `;

  const renderLink = (item: { label: string; path: string; icon: React.ElementType }) => (
    <li key={item.path}>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        onClick={onCloseMobile}
        // When collapsed the label is not rendered, so it has to come from
        // aria-label instead — otherwise the link is just an icon.
        aria-label={isCollapsed ? item.label : undefined}
        className={linkClasses}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0 opacity-90" aria-hidden="true" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    </li>
  );

  /**
   * Section headings double as the accessible name for each nav group, so the
   * groups stay distinguishable when the sidebar collapses to icons.
   */
  const renderSection = (
    text: string,
    items: { label: string; path: string; icon: React.ElementType }[],
  ) => {
    const headingId = `sidebar-section-${text.toLowerCase()}`;
    return (
      <li>
        {isCollapsed ? (
          <>
            <span id={headingId} className="sr-only">
              {text}
            </span>
            <div className="my-2 mx-3 border-t border-white/[0.06]" aria-hidden="true" />
          </>
        ) : (
          <h2
            id={headingId}
            className="px-3 pt-5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest"
          >
            {text}
          </h2>
        )}
        <ul aria-labelledby={headingId} className="space-y-0.5 list-none p-0 m-0">
          {items.map(renderLink)}
        </ul>
      </li>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        aria-label="Dashboard sidebar"
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-50
          bg-[#12141f] border-r border-white/[0.06] flex flex-col justify-between
          transition-all duration-200 ease-out
          ${isCollapsed ? 'w-[68px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Logo */}
        <div>
          <div className="px-3.5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <span className="text-white text-[13px] font-bold">AB</span>
                </div>
                {!isCollapsed && (
                  <div>
                    <span className="font-bold text-[14px] text-white tracking-tight block">AccessBelt</span>
                    <span className="text-[10px] text-slate-400 font-medium">Analytics</span>
                  </div>
                )}
              </div>

              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main navigation" className="px-2 mt-3">
            <ul className="space-y-0.5 list-none p-0 m-0">
              {renderSection('Analytics', analyticsNav)}
              {renderSection('Insights', insightsNav)}
              {renderSection('Reports', reportsNav)}
              {renderSection('Account', settingsNav)}
            </ul>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-2 border-t border-white/[0.06]">
          <button
            onClick={onSignOut}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium
              text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
