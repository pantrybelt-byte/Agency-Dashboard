import React, { useState } from 'react';
import { Bell, Menu, ChevronDown, User, Settings, LogOut, RefreshCw, Share2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRangePicker } from '../ui/DateRangePicker';
import { CountyScopeSelector } from '../ui/CountyScopeSelector';
import { Menu as MenuPopover, MenuItem } from '../ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { checkFirebaseConnectionStatus } from '../../services/firebaseStatus';
import { ALL_COUNTIES } from '../../utils/scoping';

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle, onToggleSidebar }) => {
  const { user, signOut } = useAuth();
  const { dateRange, customRange, compareMode, countyScope, setDateRange, setCompareMode, setCountyScope } =
    useDashboardFilters();
  const navigate = useNavigate();
  const connection = checkFirebaseConnectionStatus();
  const [activePreset, setActivePreset] = useState("📊 Grant & Community Impact");
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedLockedModule, setSelectedLockedModule] = useState("");
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleManualSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleShareView = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Clipboard access is denied outside secure contexts. Failing quietly
      // beats showing a "Copied!" confirmation for something that never copied.
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 gap-3">
        {/* Left: Mobile menu + Page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">{pageTitle}</h1>
              <button
                type="button"
                onClick={handleManualSync}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all text-[10px] font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  connection.isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                }`}
                aria-label={`Data source: ${connection.mode}. Refresh dashboard data.`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connection.isConnected ? 'bg-emerald-400 animate-pulse-glow' : 'bg-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{connection.mode}</span>
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="sr-only" role="status">
                  {isRefreshing ? 'Refreshing' : ''}
                </span>
              </button>
            </div>
            {pageSubtitle && <p className="text-[12px] text-slate-300 mt-0.5 truncate">{pageSubtitle}</p>}
            {countyScope !== ALL_COUNTIES && (
              <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                Scoped to {countyScope} County
              </p>
            )}
          </div>
        </div>

        {/* Right: Date range + Share + Notifications + User */}
        <div className="flex items-center gap-3 shrink-0">
          {/* View Category & Subscription Tier Preset Switcher */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsPresetOpen(!isPresetOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <span>{activePreset}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            </button>

            {isPresetOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-[#161926] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-[12px] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                  Active Subscription View Presets
                </p>

                <button
                  onClick={() => { setActivePreset("📊 Grant & Community Impact"); setIsPresetOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold text-left"
                >
                  <span>📊 Grant & Community Impact</span>
                  <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">Unlocked</span>
                </button>

                <button
                  onClick={() => { setSelectedLockedModule("🏥 SDOH Healthcare & Medicaid Compliance"); setIsUpgradeModalOpen(true); setIsPresetOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-300 text-left transition-colors"
                >
                  <span>🏥 SDOH Healthcare & Medicaid</span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 flex items-center gap-1">🔒 Locked</span>
                </button>

                <button
                  onClick={() => { setSelectedLockedModule("📋 IRS CHNA Hospital Audit"); setIsUpgradeModalOpen(true); setIsPresetOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-300 text-left transition-colors"
                >
                  <span>📋 IRS CHNA Hospital Audit</span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 flex items-center gap-1">🔒 Locked</span>
                </button>

                <button
                  onClick={() => { setSelectedLockedModule("🚨 Disaster & Emergency Logistics"); setIsUpgradeModalOpen(true); setIsPresetOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-300 text-left transition-colors"
                >
                  <span>🚨 Disaster & Emergency Logistics</span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 flex items-center gap-1">🔒 Locked</span>
                </button>

                <button
                  onClick={() => { setSelectedLockedModule("🏢 Corporate CSR Sponsor Overview"); setIsUpgradeModalOpen(true); setIsPresetOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-slate-300 text-left transition-colors"
                >
                  <span>🏢 Corporate CSR Sponsor View</span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 flex items-center gap-1">🔒 Locked</span>
                </button>
              </div>
            )}
          </div>
          <div className="hidden xl:block">
            <CountyScopeSelector
              assignedCounties={user.assignedCounties}
              regionLabel={user.region}
              value={countyScope}
              onChange={setCountyScope}
            />
          </div>

          <div className="hidden sm:block">
            <DateRangePicker
              selected={dateRange}
              customRange={customRange}
              onChange={setDateRange}
              compareMode={compareMode}
              onToggleCompare={setCompareMode}
            />
          </div>

          <button
            type="button"
            onClick={handleShareView}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all text-[12px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Copy a link to this view, including the current filters"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
          <span aria-live="polite" className="sr-only">
            {copiedLink ? 'Link copied to clipboard' : ''}
          </span>

          <button
            type="button"
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Notifications, 1 unread"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse-glow"
              aria-hidden="true"
            />
          </button>

          <MenuPopover
            label={`Account menu for ${user.name}`}
            triggerClassName="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            menuClassName="w-64"
            trigger={
              <>
                <span
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold shadow-lg shadow-indigo-500/20"
                  aria-hidden="true"
                >
                  {user.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span className="hidden md:block text-left">
                  <span className="block text-[13px] font-medium text-white leading-tight">{user.name}</span>
                  <span className="block text-[10px] text-slate-400">{user.organization}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" aria-hidden="true" />
              </>
            }
          >
            {(close) => (
              <>
                <div className="p-3.5 border-b border-white/[0.08] bg-white/[0.02]">
                  <p className="text-[13px] font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-300">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {user.assignedCounties.length} counties
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <MenuItem
                    icon={<User className="w-4 h-4 text-slate-400" aria-hidden="true" />}
                    onSelect={() => {
                      close(false);
                      navigate('/settings');
                    }}
                  >
                    Profile &amp; permissions
                  </MenuItem>
                  <MenuItem
                    icon={<Settings className="w-4 h-4 text-slate-400" aria-hidden="true" />}
                    onSelect={() => {
                      close(false);
                      navigate('/settings');
                    }}
                  >
                    Agency settings
                  </MenuItem>
                </div>
                <div className="py-1 border-t border-white/[0.08]">
                  <MenuItem
                    variant="danger"
                    icon={<LogOut className="w-4 h-4" aria-hidden="true" />}
                    onSelect={signOut}
                  >
                    Sign out
                  </MenuItem>
                </div>
              </>
            )}
          </MenuPopover>
        </div>
      </div>

      {/* On narrow screens the date controls get their own scrollable row —
          previously they were hidden entirely, so mobile users could not
          change the date range at all. */}
      <div className="xl:hidden px-5 sm:px-8 pb-3 flex items-center gap-3 overflow-x-auto">
        <CountyScopeSelector
          assignedCounties={user.assignedCounties}
          regionLabel={user.region}
          value={countyScope}
          onChange={setCountyScope}
          className="shrink-0"
        />
        <div className="sm:hidden shrink-0">
          <DateRangePicker
            selected={dateRange}
            customRange={customRange}
            onChange={setDateRange}
            compareMode={compareMode}
            onToggleCompare={setCompareMode}
          />
        </div>
      </div>
          {/* Upgrade Modal for Locked Feature Presets */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161926] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                🔒 Add-On Module Upgrade
              </span>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">{selectedLockedModule}</h3>
              <p className="text-[13px] text-slate-300 leading-relaxed">
                This premium analytics module is locked under your current Tier 2 account. Unlock real-time compliance reporting, SDOH audit feeds, and automated grant exports.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>Invoicing Options:</span>
                <span className="font-semibold text-emerald-400">QuickBooks Net-30 / Stripe</span>
              </div>
              <div className="flex justify-between">
                <span>Contract Type:</span>
                <span className="font-semibold text-white">Grant-Funded Add-On</span>
              </div>
            </div>

            {upgradeSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-center font-semibold text-xs border border-emerald-500/30">
                ✅ Upgrade Request Sent! Our account manager will issue your Net-30 invoice.
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setUpgradeSubmitted(true)}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[13px] rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Request Module Upgrade
                </button>
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-[13px] rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
