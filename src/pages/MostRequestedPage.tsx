import React, { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Filter, ArrowUpDown, Download, Search } from 'lucide-react';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import { mockRequestedItems, mockCategoryBreakdown } from '../data/mockData';
import { exportToCSV } from '../utils/csvExport';

const trendIcons = {
  rising: TrendingUp,
  steady: Minus,
  declining: TrendingDown,
};

const trendColors = {
  rising: 'text-emerald-400',
  steady: 'text-slate-400',
  declining: 'text-red-400',
};

const categoryColors: Record<string, string> = {
  'Canned Goods': '#10b981',
  'Fresh Produce': '#6366f1',
  'Proteins & Meat': '#f59e0b',
  'Dairy & Refrigerated': '#3b82f6',
  'Bakery & Grains': '#ec4899',
  'Baby & Hygiene': '#8b5cf6',
  'Beverages': '#14b8a6',
  'Prepared Meals': '#f97316',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1e2235] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-[12px] font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export const MostRequestedPage: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'requestCount' | 'trendPercentage'>('requestCount');
  const [searchItem, setSearchItem] = useState('');

  const categories = ['all', ...new Set(mockRequestedItems.map(i => i.category))];

  const filteredItems = mockRequestedItems
    .filter(item => (categoryFilter === 'all' || item.category === categoryFilter) &&
      item.name.toLowerCase().includes(searchItem.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'requestCount') return b.requestCount - a.requestCount;
      return Math.abs(b.trendPercentage) - Math.abs(a.trendPercentage);
    });

  const top15 = filteredItems.slice(0, 15);

  const handleExportCSV = () => {
    exportToCSV('Most_Requested_Items_Intelligence', filteredItems, [
      { key: 'name', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'requestCount', label: 'Request Count' },
      { key: 'trend', label: 'Trend Direction' },
      { key: 'trendPercentage', label: 'Trend Percentage (%)' },
      { key: 'lastRequested', label: 'Last Requested' },
    ]);
  };

  const Sparkline: React.FC<{ data: number[]; trend: string; name: string }> = ({ data, trend, name }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const color = trend === 'rising' ? '#34d399' : trend === 'declining' ? '#f87171' : '#94a3b8';
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 60;
        const y = 20 - ((v - min) / range) * 16;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg
        width="60"
        height="24"
        role="img"
        aria-label={`${name}: seven day requests from ${data[0]} to ${data[data.length - 1]}, ${trend}`}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setSortBy(sortBy === 'requestCount' ? 'trendPercentage' : 'requestCount')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort by {sortBy === 'requestCount' ? 'Requests' : 'Trend'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 15 Horizontal Bar */}
        <ChartCard
          title="Top 15 Most Requested"
          subtitle={categoryFilter === 'all' ? 'All categories' : categoryFilter}
          className="lg:col-span-2"
          dataTable={{
            columns: ['Item', 'Category', 'Requests'],
            rows: top15.map((item) => [item.name, item.category, item.requestCount]),
          }}
        >
          <div className="h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top15.map(item => ({
                  name: item.name.length > 25 ? item.name.slice(0, 25) + '…' : item.name,
                  requests: item.requestCount,
                  category: item.category,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={160}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requests" name="Requests" radius={[0, 6, 6, 0]} barSize={18}>
                  {top15.map((entry, index) => (
                    <Cell key={index} fill={categoryColors[entry.category] || '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Category Donut */}
        <ChartCard
          title="By Category"
          subtitle="Distribution of total items"
          dataTable={{
            columns: ['Category', 'Items'],
            rows: mockCategoryBreakdown.map((entry) => [entry.category, entry.value]),
          }}
        >
          <div className="h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mockCategoryBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString(), 'Items']}
                  contentStyle={{
                    backgroundColor: '#1e2235',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {mockCategoryBreakdown.map(item => (
              <div key={item.category} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-slate-400">{item.category}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Full Item Table */}
      <ChartCard
        title="All Requested Items"
        subtitle={`${filteredItems.length} items · ${categoryFilter === 'all' ? 'All categories' : categoryFilter}`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                placeholder="Search Item..."
                className="pl-8 pr-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <DataTable
          caption="Every requested item with its request count and seven-day trend"
          data={filteredItems}
          rowKey={(item) => item.id}
          initialSortKey="requestCount"
          emptyMessage={
            searchItem ? `No items match “${searchItem}”.` : 'No items in this category.'
          }
          columns={[
            {
              key: 'name',
              label: 'Item',
              sortable: true,
              render: (item) => <span className="font-medium text-white">{item.name}</span>,
            },
            {
              key: 'category',
              label: 'Category',
              sortable: true,
              render: (item) => (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap"
                  style={{
                    color: categoryColors[item.category] || '#cbd5e1',
                    backgroundColor: `${categoryColors[item.category] || '#cbd5e1'}22`,
                    borderColor: `${categoryColors[item.category] || '#cbd5e1'}55`,
                  }}
                >
                  {item.category}
                </span>
              ),
            },
            {
              key: 'requestCount',
              label: 'Requests',
              align: 'right',
              sortable: true,
              render: (item) => (
                <span className="font-semibold text-white">{item.requestCount.toLocaleString()}</span>
              ),
            },
            {
              key: 'weeklyData',
              label: '7-Day',
              srLabel: ' request history',
              align: 'center',
              render: (item) => (
                <span className="flex justify-center">
                  <Sparkline data={item.weeklyData} trend={item.trend} name={item.name} />
                </span>
              ),
            },
            {
              key: 'trendPercentage',
              label: 'Trend',
              align: 'right',
              sortable: true,
              render: (item) => {
                const TrendIcon = trendIcons[item.trend];
                return (
                  <span className={`inline-flex items-center gap-1 ${trendColors[item.trend]}`}>
                    <TrendIcon className="w-3 h-3" aria-hidden="true" />
                    <span className="text-[12px] font-semibold">
                      {item.trendPercentage > 0 ? '+' : ''}
                      {item.trendPercentage}%
                    </span>
                    <span className="sr-only">{item.trend}</span>
                  </span>
                );
              },
            },
            {
              key: 'lastRequested',
              label: 'Last Req.',
              srLabel: 'uested',
              align: 'right',
              sortable: true,
              render: (item) => <span className="text-[12px] text-slate-300">{item.lastRequested}</span>,
            },
          ]}
        />
      </ChartCard>
    </div>
  );
};
