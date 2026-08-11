import React, { useState } from 'react';
import { Building2, Mail, MapPin, Bell, Key, Shield, Plus, Trash2, CheckCircle, Database } from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { mockThresholdAlerts } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(mockThresholdAlerts);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newCounty, setNewCounty] = useState('Lowndes County');
  const [newMetric, setNewMetric] = useState('Food Access Score');
  const [newThreshold, setNewThreshold] = useState(25);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // RequireAuth guarantees a user before this renders; this satisfies the
  // type checker without a non-null assertion.
  if (!user) return null;

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlert = {
      id: `alt_${Date.now()}`,
      metric: newMetric,
      countyOrPantry: newCounty,
      condition: 'less_than' as const,
      thresholdValue: newThreshold,
      notifyEmail: user.email,
      isTriggered: false,
    };
    setAlerts([newAlert, ...alerts]);
    setShowAddAlert(false);
    setToastMessage(`Threshold alert created for ${newCounty}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1d2e] border border-emerald-500/20 shadow-xl px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-[13px] text-white">{toastMessage}</p>
        </div>
      )}

      {/* Agency Profile */}
      <ChartCard title="Agency Profile & Regional Scoping" subtitle="Your organization & county data access">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20 shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{user.name}</p>
              <p className="text-[13px] text-slate-400">{user.role}</p>
              <p className="text-[12px] text-emerald-400 font-medium mt-1">{user.organization}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email</p>
              </div>
              <p className="text-[14px] text-white">{user.email}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organization</p>
              </div>
              <p className="text-[14px] text-white">{user.organization}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Counties</p>
              </div>
              <p className="text-[13px] text-white font-medium">{user.assignedCounties.join(', ')}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Permissions</p>
              </div>
              <p className="text-[13px] text-emerald-400 font-medium">Export CSV · Alert Config · User Admin</p>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Threshold Alerts Config */}
      <ChartCard
        title="Automated Threshold Alerts"
        subtitle="Get notified when food access scores drop or pantries go offline"
        action={
          <button
            onClick={() => setShowAddAlert(!showAddAlert)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Alert
          </button>
        }
      >
        {showAddAlert && (
          <form onSubmit={handleAddAlert} className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <p className="text-[13px] font-semibold text-white">Create New Threshold Alert</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target County / Item</label>
                <select
                  value={newCounty}
                  onChange={(e) => setNewCounty(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0f1117] border border-white/[0.1] rounded-lg text-white text-[12px]"
                >
                  <option value="Lowndes County">Lowndes County</option>
                  <option value="Macon County">Macon County</option>
                  <option value="Dallas County">Dallas County</option>
                  <option value="Montgomery County">Montgomery County</option>
                  <option value="Infant Formula (Stage 1)">Infant Formula (Stage 1)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Metric</label>
                <select
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0f1117] border border-white/[0.1] rounded-lg text-white text-[12px]"
                >
                  <option value="Food Access Score">Food Access Score</option>
                  <option value="Offline Duration">Pantry Offline Status</option>
                  <option value="Demand Spike">Item Demand Spike</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Threshold Value</label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#0f1117] border border-white/[0.1] rounded-lg text-white text-[12px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddAlert(false)}
                className="px-3 py-1.5 text-[12px] text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-[12px] font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer"
              >
                Save Alert Rule
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.isTriggered ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{alert.countyOrPantry} — {alert.metric}</p>
                  <p className="text-[11px] text-slate-400">
                    Trigger when {alert.metric.toLowerCase()} is {alert.condition.replace('_', ' ')} {alert.thresholdValue}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {alert.isTriggered && (
                  <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    Active Alert ({alert.lastTriggered})
                  </span>
                )}
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Delete alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Firebase Integration Status */}
      <ChartCard title="Firebase & Live Database Integration" subtitle="Live stream listener configuration">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white">Firebase Firestore / Realtime DB Ready</p>
                <p className="text-[12px] text-slate-400">Ready to accept live stream metrics when backend is connected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
              <span className="text-[12px] text-emerald-400 font-semibold">Config Scaffolding Complete</span>
            </div>
          </div>

          {/* API Key */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">Firebase API Configuration</p>
                <p className="text-[12px] text-slate-400">Add your Firebase config credentials in .env</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-[#0f1117] border border-white/[0.06] text-[12px] text-slate-400 font-mono">
                VITE_FIREBASE_API_KEY=AIzaSyA••••••••••••••••••••
              </code>
              <button className="px-3 py-2 rounded-lg text-[12px] font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors cursor-pointer">
                Config Docs
              </button>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};
