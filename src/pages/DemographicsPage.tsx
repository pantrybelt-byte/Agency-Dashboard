import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Users, Download, UserCheck, Heart, ShieldCheck, MapPin } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import { mockDemographics } from '../data/mockData';
import { exportToCSV } from '../utils/csvExport';
import {
  AGE_GROUP_CHILDREN,
  AGE_GROUP_SENIORS,
  VISITOR_TYPE_FIRST_TIME,
  averageHouseholdSize,
  countByAgeGroup,
  countByVisitorType,
} from '../utils/demographics';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1e2235] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-[12px] font-semibold" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export const DemographicsPage: React.FC = () => {
  const demographics = mockDemographics;
  const [searchTerm, setSearchTerm] = useState('');

  // Derived from the dataset rather than hardcoded, so these move with the
  // data once Firebase supplies it.
  const childrenServed = countByAgeGroup(demographics, AGE_GROUP_CHILDREN);
  const seniorsServed = countByAgeGroup(demographics, AGE_GROUP_SENIORS);
  const firstTimeRecipients = countByVisitorType(demographics, VISITOR_TYPE_FIRST_TIME);
  const avgHouseholdSize = averageHouseholdSize(demographics);

  const filteredZipCodes = demographics.zipCodeBreakdown.filter(
    (item) =>
      item.zip.includes(searchTerm) ||
      item.community.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.county.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportZipCSV = () => {
    exportToCSV('Demographics_ZIP_Breakdown', demographics.zipCodeBreakdown, [
      { key: 'zip', label: 'ZIP Code' },
      { key: 'community', label: 'Community / Neighborhood' },
      { key: 'county', label: 'County' },
      { key: 'familiesServed', label: 'Families Served' },
      { key: 'growthRate', label: 'Growth Rate (%)' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Compliance Notice Bar */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">United Way & USDA Grant Reporting Standard</p>
            <p className="text-[12px] text-slate-400">
              Community demographics, household composition, visitor frequency, and census ZIP metrics.
            </p>
          </div>
        </div>
        <button
          onClick={handleExportZipCSV}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-500 text-white text-[12px] font-semibold hover:bg-indigo-600 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export Demographics CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Children Impacted (0–17)"
          value={childrenServed}
          trend={15.4}
          trendLabel="vs last period"
          icon={<Heart className="w-5 h-5 text-indigo-400" />}
          glowClass="metric-glow-indigo"
        />
        <MetricCard
          label="Seniors Served (60+)"
          value={seniorsServed}
          trend={18.2}
          trendLabel="vs last period"
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          glowClass="metric-glow-emerald"
          animationDelay="delay-100"
        />
        <MetricCard
          label="First-Time Recipients"
          value={firstTimeRecipients}
          trend={22.0}
          trendLabel="vs last period"
          icon={<UserCheck className="w-5 h-5 text-blue-400" />}
          glowClass="metric-glow-blue"
          animationDelay="delay-200"
        />
        <MetricCard
          label="Avg Household Size"
          value={`${avgHouseholdSize} Persons`}
          icon={<MapPin className="w-5 h-5 text-amber-400" />}
          glowClass="metric-glow-amber"
          animationDelay="delay-300"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Age Group Distribution */}
        <ChartCard
          title="Age Group Distribution"
          subtitle="Percent of total population served"
          dataTable={{
            columns: ['Age group', 'Individuals', 'Share (%)'],
            rows: demographics.ageGroups.map((entry) => [entry.group, entry.count, entry.percentage]),
          }}
        >
          <div className="h-[240px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.ageGroups}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="group"
                >
                  {demographics.ageGroups.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Individuals']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {demographics.ageGroups.map((item) => (
              <div key={item.group} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-300">{item.group} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Visitor Frequency & Recency */}
        <ChartCard
          title="Visitor Type & Frequency"
          subtitle="First-time vs repeat assistance"
          dataTable={{
            columns: ['Visitor type', 'Families', 'Share (%)'],
            rows: demographics.visitorTypes.map((entry) => [entry.type, entry.count, entry.percentage]),
          }}
        >
          <div className="h-[240px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.visitorTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="type"
                >
                  {demographics.visitorTypes.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Families']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {demographics.visitorTypes.map((item) => (
              <div key={item.type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-300">{item.type} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Household Size Distribution */}
        <ChartCard
          title="Household Size"
          subtitle="Number of family members per household"
          dataTable={{
            columns: ['Household size', 'Households', 'Share (%)'],
            rows: demographics.householdSizes.map((entry) => [entry.size, entry.count, entry.percentage]),
          }}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographics.householdSizes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="size" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Households" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Racial & Ethnic Demographics + ZIP Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ethnicity Distribution Card */}
        <ChartCard
          title="Racial & Ethnic Demographics"
          subtitle="USDA Civil Rights Compliance breakdown"
          dataTable={{
            columns: ['Category', 'Share (%)'],
            rows: demographics.ethnicityBreakdown.map((entry) => [entry.category, entry.percentage]),
          }}
        >
          <div className="space-y-3.5 my-2">
            {demographics.ethnicityBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-slate-300 font-medium">{item.category}</span>
                  <span className="text-white font-bold">{item.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Community ZIP Code Breakdown Table */}
        <ChartCard
          title="Community ZIP Code Coverage"
          subtitle="Top zip codes in River Region"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ZIP or County..."
                className="px-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleExportZipCSV}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          }
        >
          <DataTable
            caption="Families served by ZIP code across the River Region"
            data={filteredZipCodes}
            rowKey={(item) => item.zip}
            initialSortKey="familiesServed"
            emptyMessage={`No ZIP codes match “${searchTerm}”.`}
            columns={[
              {
                key: 'zip',
                label: 'ZIP',
                srLabel: ' code',
                sortable: true,
                render: (item) => (
                  <span className="font-mono text-emerald-300 font-medium">{item.zip}</span>
                ),
              },
              {
                key: 'community',
                label: 'Community / Area',
                sortable: true,
                render: (item) => <span className="text-white font-medium">{item.community}</span>,
              },
              { key: 'county', label: 'County', sortable: true },
              {
                key: 'familiesServed',
                label: 'Families Served',
                align: 'right',
                sortable: true,
                render: (item) => (
                  <span className="text-white font-bold">{item.familiesServed.toLocaleString()}</span>
                ),
              },
              {
                key: 'growthRate',
                label: 'Growth Rate',
                align: 'right',
                sortable: true,
                render: (item) => (
                  <span
                    className={`text-[12px] font-semibold ${
                      item.growthRate >= 0 ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {item.growthRate >= 0 ? '+' : ''}
                    {item.growthRate}%
                  </span>
                ),
              },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
};
