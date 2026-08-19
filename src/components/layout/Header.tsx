import React, { useState } from 'react';
import { Bell, Menu, ChevronDown, User, Settings, LogOut, Share2, Check, AlertTriangle } from 'lucide-react';
import { PresetSwitcher } from '../ui/PresetSwitcher';
import { PreviewModeSwitcher } from '../ui/PreviewModeSwitcher';
import { UpgradeModal } from '../ui/UpgradeModal';
import { usePreset } from '../../hooks/usePreset';
import { useNavigate } from 'react-router-dom';
import { DateRangePicker } from '../ui/DateRangePicker';
import { CountyScopeSelector } from '../ui/CountyScopeSelector';
import { Menu as MenuPopover, MenuItem } from '../ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { checkFirebaseConnectionStatus } from '../../services/firebaseStatus';
import { useLiveData } from '../../hooks/useLiveData';
import { subscribeThresholdAlerts } from '../../services/dashboardData';
import type { ThresholdAlert } from '../../types';
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
  const { pendingUpgrade, dismissUpgrade } = usePreset();
  const [copiedLink, setCopiedLink] = useState(false);

  // Notifications are the threshold alerts that have actually fired. The bell
  // previously carried a permanent "1 unread" dot and opened nothing.
  const { data: alerts } = useLiveData(subscribeThresholdAlerts, [] as ThresholdAlert[]);
  const triggered = alerts.filter((alert) => alert.isTriggered);

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
    // `overflow-x-clip` rather than `hidden`: the filter row below scrolls
    // horizontally on narrow screens, and without a clip here its width
    // propagated out and made the whole page scroll sideways on a phone.
    // `clip` contains it without creating a scroll container, which `hidden`
    // would — and that would break the sticky positioning.
    <header className="sticky top-0 z-30 overflow-x-clip bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 gap-3">
        {/* Left: Mobile menu + Page title */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
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
              {/* Data source, stated plainly. This used to be a button whose
                  refresh spun for 1.2 seconds and re-read nothing — and once
                  Firestore is connected the listeners stream, so there is
                  nothing for a manual refresh to do. */}
              <span
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                  connection.isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
                title={
                  connection.isConnected
                    ? 'Live Firestore listeners — figures update as rollups are written.'
                    : 'Demonstration rollups generated in the browser. No database is connected.'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connection.isConnected ? 'bg-emerald-400 animate-pulse-glow' : 'bg-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{connection.mode}</span>
              </span>

              <PreviewModeSwitcher className="hidden sm:block" />
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
          <PresetSwitcher className="hidden md:block" />

          <div className="hidden 2xl:block">
            <CountyScopeSelector
              assignedCounties={user.assignedCounties}
              regionLabel={user.region}
              value={countyScope}
              onChange={setCountyScope}
            />
          </div>

          <div className="hidden xl:block">
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
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all text-[12px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
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

          <MenuPopover
            label={
              triggered.length === 0
                ? 'Notifications, none pending'
                : `Notifications, ${triggered.length} threshold ${triggered.length === 1 ? 'alert' : 'alerts'} triggered`
            }
            triggerClassName="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            menuClassName="w-80"
            trigger={
              <>
                <Bell className="w-5 h-5" aria-hidden="true" />
                {triggered.length > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse-glow"
                    aria-hidden="true"
                  />
                )}
              </>
            }
          >
            {(close) => (
              <>
                <div className="p-3.5 border-b border-white/[0.08] bg-white/[0.02]">
                  <p className="text-[13px] font-semibold text-white">Threshold alerts</p>
                  <p className="text-[11px] text-slate-300">
                    {triggered.length === 0
                      ? 'Nothing has crossed a threshold you configured.'
                      : `${triggered.length} of your ${alerts.length} alerts ${triggered.length === 1 ? 'has' : 'have'} fired.`}
                  </p>
                </div>
                {triggered.length > 0 && (
                  <ul className="max-h-64 overflow-y-auto py-1 list-none m-0 p-0">
                    {triggered.map((alert) => (
                      <li key={alert.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-medium text-white">
                            {alert.countyOrPantry}
                          </span>
                          <span className="block text-[11px] text-slate-300">
                            {alert.metric} {alert.condition === 'less_than' ? 'below' : alert.condition === 'greater_than' ? 'above' : 'changed to'}{' '}
                            <span className="font-mono">{alert.thresholdValue}</span>
                            {alert.lastTriggered ? ` · ${alert.lastTriggered}` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="py-1 border-t border-white/[0.08]">
                  <MenuItem
                    icon={<Settings className="w-4 h-4 text-slate-400" aria-hidden="true" />}
                    onSelect={() => {
                      close(false);
                      navigate('/settings');
                    }}
                  >
                    Manage threshold alerts
                  </MenuItem>
                </div>
              </>
            )}
          </MenuPopover>

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
      <div className="2xl:hidden px-5 sm:px-8 pb-3 flex items-center gap-3 overflow-x-auto">
        <PresetSwitcher className="md:hidden shrink-0" />
        <CountyScopeSelector
          assignedCounties={user.assignedCounties}
          regionLabel={user.region}
          value={countyScope}
          onChange={setCountyScope}
          className="shrink-0"
        />
        <div className="xl:hidden shrink-0">
          <DateRangePicker
            selected={dateRange}
            customRange={customRange}
            onChange={setDateRange}
            compareMode={compareMode}
            onToggleCompare={setCompareMode}
          />
        </div>
      </div>
      <UpgradeModal preset={pendingUpgrade} onClose={dismissUpgrade} />
    </header>
  );
};
