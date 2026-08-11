import React, { useState } from 'react';
import { Search, Filter, ZoomIn, ZoomOut, RotateCcw, ShoppingBag } from 'lucide-react';
import { alabamaCounties, getCountyColor, getStatusFromScore, type AlabamaCountyData } from '../../data/alabamaCounties';

interface AlabamaHeatMapProps {
  selectedCountyId?: string | null;
  onSelectCounty?: (county: AlabamaCountyData) => void;
}

export const AlabamaHeatMap: React.FC<AlabamaHeatMapProps> = ({
  selectedCountyId,
  onSelectCounty,
}) => {
  const [hoveredCounty, setHoveredCounty] = useState<AlabamaCountyData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [regionFilter, setRegionFilter] = useState<'all' | 'River Region' | 'Black Belt' | 'critical'>('all');
  const [shadingMetric, setShadingMetric] = useState<'foodAccessScore' | 'povertyRate' | 'nearestPantryMiles'>('foodAccessScore');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Helper to compute color dynamically based on selected metric
  const getDynamicColor = (county: AlabamaCountyData) => {
    if (shadingMetric === 'foodAccessScore') {
      return getCountyColor(county.foodAccessScore);
    } else if (shadingMetric === 'povertyRate') {
      if (county.povertyRate > 25) return '#ef4444'; // High Poverty = Red
      if (county.povertyRate > 18) return '#f59e0b';
      if (county.povertyRate > 14) return '#3b82f6';
      return '#10b981';
    } else {
      if (county.nearestPantryMiles > 10) return '#ef4444'; // Far distance = Red
      if (county.nearestPantryMiles > 6) return '#f59e0b';
      if (county.nearestPantryMiles > 4) return '#3b82f6';
      return '#10b981';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, county: AlabamaCountyData) => {
    const target = e.currentTarget;
    const svg = target.ownerSVGElement || target.closest('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredCounty(county);
  };

  const filteredCounties = alabamaCounties.filter((county) => {
    const matchesSearch = county.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          county.abbrev.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          county.zipCodes.some(z => z.includes(searchTerm));
    if (!matchesSearch) return false;

    if (regionFilter === 'River Region') return county.region === 'River Region';
    if (regionFilter === 'Black Belt') return county.region === 'Black Belt' || county.region === 'River Region';
    if (regionFilter === 'critical') return county.foodAccessScore < 25;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Control Bar: Metric Selector + Region Filter + Search */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        {/* Shading Metric Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Shading Metric:</span>
          <button
            onClick={() => setShadingMetric('foodAccessScore')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              shadingMetric === 'foodAccessScore'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
            }`}
          >
            Food Access Score
          </button>
          <button
            onClick={() => setShadingMetric('povertyRate')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              shadingMetric === 'povertyRate'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
            }`}
          >
            Poverty Rate (%)
          </button>
          <button
            onClick={() => setShadingMetric('nearestPantryMiles')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              shadingMetric === 'nearestPantryMiles'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
            }`}
          >
            Nearest Pantry Distance
          </button>
        </div>

        {/* Region Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as any)}
              className="px-2.5 py-1 text-[12px] bg-[#0f1117] border border-white/[0.1] rounded-lg text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All 67 Counties</option>
              <option value="River Region">River Region (Primary Focus)</option>
              <option value="Black Belt">River Region & Black Belt</option>
              <option value="critical">Critical Zones Only (&lt; 25)</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search County..."
              className="pl-8 pr-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-36"
            />
          </div>
        </div>
      </div>

      {/* Map Display Card */}
      <div className="relative rounded-2xl bg-[#12141f] border border-white/[0.08] p-4 min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Zoom Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-[#1a1d2e]/90 border border-white/[0.1] rounded-xl p-1 backdrop-blur-md shadow-xl">
          <button
            onClick={() => setZoomLevel(Math.min(zoomLevel + 0.15, 1.4))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(Math.max(zoomLevel - 0.15, 0.85))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* River Region Outline Watermark */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          <span className="text-[11px] font-bold text-emerald-400">State of Alabama Heatmap</span>
          <span className="text-[10px] text-slate-400 font-medium">({filteredCounties.length} Counties)</span>
        </div>

        {/* Main Vector SVG Map Container */}
        <div className="relative w-full max-w-[560px] aspect-[330/410] transition-transform duration-200" style={{ transform: `scale(${zoomLevel})` }}>
          <svg
            viewBox="0 0 330 410"
            className="w-full h-full drop-shadow-2xl overflow-visible select-none"
            onMouseLeave={() => setHoveredCounty(null)}
          >
            {/* Background Alabama State Outline Silhouette */}
            <path
              d="M 40 5 
                 L 310 5 
                 L 310 240 
                 L 325 240 
                 L 325 330 
                 L 250 335 
                 L 220 375 
                 L 180 395 
                 L 150 350 
                 L 130 335 
                 L 115 395 
                 L 40 395 
                 Z"
              fill="rgba(15, 17, 23, 0.95)"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* River Region Boundary Frame */}
            <rect
              x="115"
              y="205"
              width="155"
              height="70"
              rx="12"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <text x="192" y="200" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" opacity="0.8">
              River Region Focus Area
            </text>

            {/* 67 Alabama County Choropleth Cells */}
            {alabamaCounties.map((county) => {
              const color = getDynamicColor(county);
              const isSelected = selectedCountyId === county.id;
              const isHovered = hoveredCounty?.id === county.id;
              const isFilteredIn = filteredCounties.some(c => c.id === county.id);

              return (
                <g
                  key={county.id}
                  onClick={() => onSelectCounty && onSelectCounty(county)}
                  onMouseMove={(e) => handleMouseMove(e, county)}
                  className="cursor-pointer transition-all duration-150"
                  opacity={isFilteredIn ? 1 : 0.2}
                >
                  {/* County Vector Box */}
                  <rect
                    x={county.grid.x}
                    y={county.grid.y}
                    width={county.grid.w}
                    height={county.grid.h}
                    rx="4"
                    fill={color}
                    fillOpacity={isHovered ? 0.95 : isSelected ? 0.9 : 0.75}
                    stroke={isHovered || isSelected ? '#ffffff' : 'rgba(15, 17, 23, 0.85)'}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    className="transition-all duration-150"
                  />

                  {/* County Abbreviation Text Label */}
                  <text
                    x={county.grid.x + county.grid.w / 2}
                    y={county.grid.y + county.grid.h / 2 + 3.5}
                    fill={isHovered || isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.95)'}
                    fontSize={county.grid.w < 35 ? '8' : '9.5'}
                    fontWeight="700"
                    textAnchor="middle"
                    pointerEvents="none"
                    className="font-sans tracking-tight"
                  >
                    {county.abbrev}
                  </text>

                  {/* Pulsing Critical Warning Dot */}
                  {county.foodAccessScore < 25 && (
                    <circle
                      cx={county.grid.x + county.grid.w - 5}
                      cy={county.grid.y + 5}
                      r="2.5"
                      fill="#ffffff"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Hover Popover Tooltip */}
          {hoveredCounty && (
            <div
              className="absolute z-50 pointer-events-none transition-all duration-75"
              style={{
                left: `${Math.min(Math.max(tooltipPos.x + 15, 10), 300)}px`,
                top: `${Math.min(Math.max(tooltipPos.y - 80, 10), 260)}px`,
              }}
            >
              <div className="bg-[#1a1d2e]/95 border border-white/[0.15] rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-64 text-left animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-[14px] font-bold text-white leading-tight">{hoveredCounty.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{hoveredCounty.region} · FIPS {hoveredCounty.fips}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm"
                    style={{
                      color: getCountyColor(hoveredCounty.foodAccessScore),
                      backgroundColor: `${getCountyColor(hoveredCounty.foodAccessScore)}20`,
                      borderColor: `${getCountyColor(hoveredCounty.foodAccessScore)}40`,
                    }}
                  >
                    {getStatusFromScore(hoveredCounty.foodAccessScore)}
                  </span>
                </div>

                {/* Score Big Display */}
                <div className="flex items-baseline gap-2 mb-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-2xl font-black" style={{ color: getCountyColor(hoveredCounty.foodAccessScore) }}>
                    {hoveredCounty.foodAccessScore}
                  </span>
                  <span className="text-[11px] text-slate-400">/ 100 Food Access Score</span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-slate-500 text-[10px]">Population</p>
                    <p className="font-bold text-white">{hoveredCounty.population.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-slate-500 text-[10px]">Below Poverty</p>
                    <p className="font-bold text-red-400">{hoveredCounty.povertyRate}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-slate-500 text-[10px]">Nearest Pantry</p>
                    <p className="font-bold text-amber-400">{hoveredCounty.nearestPantryMiles} mi</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-slate-500 text-[10px]">Active Pantries</p>
                    <p className="font-bold text-emerald-400">{hoveredCounty.activePantries}</p>
                  </div>
                </div>

                {/* Top Item */}
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-emerald-400" />
                    Top Need:
                  </span>
                  <span className="font-semibold text-white truncate max-w-[130px]">{hoveredCounty.topRequestedItem}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Legend */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#12141f]/90 border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-semibold text-slate-400">Severity Scale:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#ef4444]" />
              <span className="text-[11px] text-slate-300 font-medium">Critical (&lt; 25)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f59e0b]" />
              <span className="text-[11px] text-slate-300 font-medium">At Risk (25–39)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#3b82f6]" />
              <span className="text-[11px] text-slate-300 font-medium">Moderate (40–59)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981]" />
              <span className="text-[11px] text-slate-300 font-medium">Adequate (60+)</span>
            </div>
          </div>

          <span className="text-[10px] text-slate-500">
            Hover over any county to inspect metrics · Click to filter details below
          </span>
        </div>
      </div>
    </div>
  );
};
