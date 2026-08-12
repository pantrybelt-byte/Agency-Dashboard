import React, { useState } from 'react';
import { Bell, Menu, ChevronDown, User, Settings, LogOut, RefreshCw, Share2, Check, MapPin } from 'lucide-react';
import type { AgencyUser } from '../../types';
import { DateRangePicker } from '../ui/DateRangePicker';
import { checkFirebaseConnectionStatus } from '../../services/firebase';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  user: AgencyUser;
  onSignOut: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageSubtitle,
  user,
  onSignOut,
  onToggleSidebar,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const connectionStatus = checkFirebaseConnectionStatus();

  // Connect directly to Global URL Query Filter State
  const filters = useDashboardFilters();

  const handleManualSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleShareView = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0f1117]/85 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-5 sm:px-8 py-3.5">
        {/* Left: Mobile menu + Page title + Live sync */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-tight">{pageTitle}</h1>

              {/* Live Sync Status Pill */}
              <button
                onClick={handleManualSync}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-semibold cursor-pointer"
                title={`Data Source: ${connectionStatus.mode}. Click to test sync.`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                <span>{connectionStatus.mode}</span>
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {pageSubtitle && (
              <p className="text-[12px] text-slate-400 mt-0.5">{pageSubtitle}</p>
            )}
          </div>
        </div>

        {/* Right: County Scope Dropdown + Date range + Share + Notifications + User */}
        <div className="flex items-center gap-3">
          {/* County Scope Dropdown Selector (Connected to URL Context) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Scope:</span>
            <select
              value={filters.countyScope}
              onChange={(e) => filters.setCountyScope(e.target.value)}
              className="bg-transparent text-[12px] font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#1a1d2e] text-white">All River Region (6 Counties)</option>
              <option value="Montgomery" className="bg-[#1a1d2e] text-white">Montgomery County</option>
              <option value="Autauga" className="bg-[#1a1d2e] text-white">Autauga County</option>
              <option value="Elmore" className="bg-[#1a1d2e] text-white">Elmore County</option>
              <option value="Lowndes" className="bg-[#1a1d2e] text-white">Lowndes County</option>
              <option value="Macon" className="bg-[#1a1d2e] text-white">Macon County</option>
              <option value="Dallas" className="bg-[#1a1d2e] text-white">Dallas County</option>
            </select>
          </div>

          <div className="hidden sm:block">
            <DateRangePicker
              selected={filters.dateRange}
              onChange={(preset) => filters.setDateRange(preset)}
              compareMode={filters.compareMode}
              onToggleCompare={(enabled) => filters.setCompareMode(enabled)}
            />
          </div>

          {/* Share View Button */}
          <button
            onClick={handleShareView}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all text-[12px] font-medium cursor-pointer"
            title="Copy shareable link with current filters"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Notification Bell */}
          <button
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse-glow" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
              aria-expanded={showUserMenu}
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold shadow-lg shadow-indigo-500/20">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-medium text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500">{user.organization}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden md:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1d2e] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <p className="text-[13px] font-semibold text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        {user.role}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {user.assignedCounties.length} Counties
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors cursor-pointer">
                      <User className="w-4 h-4 text-slate-400" />
                      Profile & Permissions
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors cursor-pointer">
                      <Settings className="w-4 h-4 text-slate-400" />
                      Agency Settings
                    </button>
                  </div>
                  <div className="py-1 border-t border-white/[0.06]">
                    <button
                      onClick={onSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
