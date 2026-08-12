import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Search, Filter, ZoomIn, ZoomOut, RotateCcw, ShoppingBag } from 'lucide-react';
import {
  alabamaCounties as staticCounties,
  getCountyColor,
  getStatusFromScore,
  type AlabamaCountyData,
} from '../../data/alabamaCounties';
import {
  ALABAMA_OUTLINE_PATH,
  ALABAMA_VIEW_HEIGHT,
  ALABAMA_VIEW_WIDTH,
  alabamaCountyGeometry,
} from '../../data/alabamaGeometry';

interface AlabamaHeatMapProps {
  /** Live county metrics. Falls back to the bundled dataset when omitted. */
  counties?: AlabamaCountyData[];
  selectedCountyId?: string | null;
  onSelectCounty?: (county: AlabamaCountyData) => void;
}

type ShadingMetric = 'foodAccessScore' | 'povertyRate' | 'nearestPantryMiles';
type RegionFilter = 'all' | 'River Region' | 'Black Belt' | 'critical';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.5;

const SHADING_METRICS: { value: ShadingMetric; label: string; activeClass: string }[] = [
  {
    value: 'foodAccessScore',
    label: 'Food Access Score',
    activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    value: 'povertyRate',
    label: 'Poverty Rate (%)',
    activeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    value: 'nearestPantryMiles',
    label: 'Nearest Pantry Distance',
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

/**
 * Colour a county by whichever metric is currently driving the shading.
 * Every scale runs red (worst) to emerald (best) so the legend stays true
 * regardless of which metric is selected.
 */
function getMetricColor(county: AlabamaCountyData, metric: ShadingMetric): string {
  if (metric === 'foodAccessScore') {
    return getCountyColor(county.foodAccessScore);
  }
  if (metric === 'povertyRate') {
    if (county.povertyRate > 25) return '#ef4444';
    if (county.povertyRate > 18) return '#f59e0b';
    if (county.povertyRate > 14) return '#3b82f6';
    return '#10b981';
  }
  if (county.nearestPantryMiles > 10) return '#ef4444';
  if (county.nearestPantryMiles > 6) return '#f59e0b';
  if (county.nearestPantryMiles > 4) return '#3b82f6';
  return '#10b981';
}

/** Sentence read out by assistive technology when a county receives focus. */
function describeCounty(county: AlabamaCountyData): string {
  const pantries = county.activePantries === 1 ? '1 active pantry' : `${county.activePantries} active pantries`;
  return (
    `${county.name}. Food access score ${county.foodAccessScore} out of 100, ${county.status}. ` +
    `Population ${county.population.toLocaleString()}. Poverty rate ${county.povertyRate} percent. ` +
    `Nearest pantry ${county.nearestPantryMiles} miles. ${pantries}. Top need ${county.topRequestedItem}.`
  );
}

/**
 * Find the county nearest to `from` in the given direction, so arrow keys move
 * across the map the way the map looks rather than in document order.
 *
 * Candidates outside the half-plane for that direction are ignored; the rest
 * are ranked by distance along the travel axis plus a doubled penalty for
 * drifting sideways, which keeps movement feeling straight.
 */
function findNeighbour(
  from: AlabamaCountyData,
  candidates: AlabamaCountyData[],
  direction: 'up' | 'down' | 'left' | 'right',
): AlabamaCountyData | null {
  const origin = alabamaCountyGeometry[from.fips];
  if (!origin) return null;

  let best: AlabamaCountyData | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (candidate.id === from.id) continue;
    const target = alabamaCountyGeometry[candidate.fips];
    if (!target) continue;

    const dx = target.labelX - origin.labelX;
    const dy = target.labelY - origin.labelY;

    let along: number;
    let across: number;
    if (direction === 'left' || direction === 'right') {
      along = direction === 'right' ? dx : -dx;
      across = Math.abs(dy);
    } else {
      along = direction === 'down' ? dy : -dy;
      across = Math.abs(dx);
    }

    if (along <= 0) continue;

    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export const AlabamaHeatMap: React.FC<AlabamaHeatMapProps> = ({
  counties,
  selectedCountyId,
  onSelectCounty,
}) => {
  // Never render an empty map: an in-flight subscription should still show the
  // state, just with the bundled figures until live ones arrive.
  const alabamaCounties = counties && counties.length > 0 ? counties : staticCounties;
  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null);
  const [focusedCountyId, setFocusedCountyId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [shadingMetric, setShadingMetric] = useState<ShadingMetric>('foodAccessScore');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(1);

  const countyRefs = useRef(new Map<string, SVGGElement>());
  const searchInputId = 'alabama-map-county-search';
  const regionSelectId = 'alabama-map-region-filter';

  const matchingCounties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return alabamaCounties.filter((county) => {
      const matchesSearch =
        term === '' ||
        county.name.toLowerCase().includes(term) ||
        county.abbrev.toLowerCase().includes(term) ||
        county.zipCodes.some((zip) => zip.includes(term));
      if (!matchesSearch) return false;

      if (regionFilter === 'River Region') return county.region === 'River Region';
      if (regionFilter === 'Black Belt') return county.region === 'Black Belt' || county.region === 'River Region';
      if (regionFilter === 'critical') return county.foodAccessScore < 25;
      return true;
    });
  }, [alabamaCounties, searchTerm, regionFilter]);

  const matchingIds = useMemo(() => new Set(matchingCounties.map((county) => county.id)), [matchingCounties]);

  /**
   * The single county reachable by Tab. Arrow keys move it around the map, so
   * the whole choropleth costs one tab stop rather than sixty-seven.
   */
  const rovingCountyId =
    (selectedCountyId && matchingIds.has(selectedCountyId) ? selectedCountyId : null) ??
    (focusedCountyId && matchingIds.has(focusedCountyId) ? focusedCountyId : null) ??
    matchingCounties[0]?.id ??
    null;

  const activeCounty =
    alabamaCounties.find((county) => county.id === (hoveredCountyId ?? focusedCountyId)) ?? null;


  const focusCounty = useCallback((county: AlabamaCountyData) => {
    setFocusedCountyId(county.id);
    countyRefs.current.get(county.id)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGGElement>, county: AlabamaCountyData) => {
      const directions: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      if (event.key in directions) {
        event.preventDefault();
        const neighbour = findNeighbour(county, matchingCounties, directions[event.key]);
        if (neighbour) focusCounty(neighbour);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        if (matchingCounties[0]) focusCounty(matchingCounties[0]);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        const last = matchingCounties[matchingCounties.length - 1];
        if (last) focusCounty(last);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelectCounty?.(county);
      }
    },
    [matchingCounties, focusCounty, onSelectCounty],
  );

  // Zoom works by narrowing the viewBox rather than CSS-scaling the element, so
  // stroke widths and label sizes stay constant while the geography magnifies.
  const viewBox = useMemo(() => {
    if (zoom <= 1) return `0 0 ${ALABAMA_VIEW_WIDTH} ${ALABAMA_VIEW_HEIGHT}`;

    const anchor = selectedCountyId
      ? alabamaCountyGeometry[alabamaCounties.find((c) => c.id === selectedCountyId)?.fips ?? '']
      : undefined;
    const centreX = anchor?.labelX ?? ALABAMA_VIEW_WIDTH / 2;
    const centreY = anchor?.labelY ?? ALABAMA_VIEW_HEIGHT / 2;

    const width = ALABAMA_VIEW_WIDTH / zoom;
    const height = ALABAMA_VIEW_HEIGHT / zoom;
    const x = Math.min(Math.max(centreX - width / 2, 0), ALABAMA_VIEW_WIDTH - width);
    const y = Math.min(Math.max(centreY - height / 2, 0), ALABAMA_VIEW_HEIGHT - height);

    return `${x} ${y} ${width} ${height}`;
  }, [zoom, selectedCountyId, alabamaCounties]);

  // Anchor the tooltip to the county's centroid expressed as a percentage of
  // the visible viewBox, so it tracks correctly at every zoom level and works
  // identically for pointer hover and keyboard focus.
  const tooltipPosition = useMemo(() => {
    if (!activeCounty) return null;
    const geometry = alabamaCountyGeometry[activeCounty.fips];
    if (!geometry) return null;

    const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);
    const left = ((geometry.labelX - vbX) / vbW) * 100;
    const top = ((geometry.labelY - vbY) / vbH) * 100;

    return {
      left: `${Math.min(Math.max(left, 0), 100)}%`,
      top: `${Math.min(Math.max(top, 0), 100)}%`,
      // Flip the tooltip toward the middle of the map so it never overflows.
      transform: `translate(${left > 55 ? '-100%' : '0'}, ${top > 55 ? '-100%' : '0'}) translate(${
        left > 55 ? '-12px' : '12px'
      }, ${top > 55 ? '-12px' : '12px'})`,
    };
  }, [activeCounty, viewBox]);

  const criticalCount = matchingCounties.filter((county) => county.foodAccessScore < 25).length;

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        <fieldset className="flex items-center gap-2 flex-wrap border-0 p-0 m-0">
          <legend className="sr-only">Choose which metric shades the map</legend>
          <span aria-hidden="true" className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Shading metric:
          </span>
          {SHADING_METRICS.map((metric) => (
            <button
              key={metric.value}
              type="button"
              onClick={() => setShadingMetric(metric.value)}
              aria-pressed={shadingMetric === metric.value}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                shadingMetric === metric.value
                  ? metric.activeClass
                  : 'text-slate-300 hover:text-white bg-white/[0.03] border-white/[0.08]'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </fieldset>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
            <label htmlFor={regionSelectId} className="sr-only">
              Filter counties by region
            </label>
            <select
              id={regionSelectId}
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value as RegionFilter)}
              className="px-2.5 py-1 text-[12px] bg-[#0f1117] border border-white/[0.12] rounded-lg text-white font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <option value="all">All 67 counties</option>
              <option value="River Region">River Region (primary focus)</option>
              <option value="Black Belt">River Region &amp; Black Belt</option>
              <option value="critical">Critical zones only (&lt; 25)</option>
            </select>
          </div>

          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">
              Search counties by name, abbreviation or ZIP code
            </label>
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search county…"
              className="pl-8 pr-3 py-1 text-[12px] bg-white/[0.04] border border-white/[0.12] rounded-lg text-white placeholder:text-slate-400 w-36 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-2xl bg-[#12141f] border border-white/[0.08] p-4 pb-16 flex items-center justify-center overflow-hidden">
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-[#1a1d2e]/90 border border-white/[0.12] rounded-xl p-1 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(current * ZOOM_STEP, MAX_ZOOM))}
            disabled={zoom >= MAX_ZOOM}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(current / ZOOM_STEP, MIN_ZOOM))}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            aria-label="Reset zoom to whole state"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" aria-hidden="true" />
          <span className="text-[11px] font-bold text-emerald-300">Alabama · 67 counties</span>
        </div>

        {/* Result count, announced when filters change. */}
        <p aria-live="polite" className="sr-only">
          {matchingCounties.length} of {alabamaCounties.length} counties shown, {criticalCount} in critical status.
        </p>

        <div className="relative w-full max-w-[440px]" style={{ aspectRatio: `${ALABAMA_VIEW_WIDTH} / ${ALABAMA_VIEW_HEIGHT}` }}>
          <svg
            viewBox={viewBox}
            className="w-full h-full select-none"
            role="group"
            aria-labelledby="alabama-map-title"
            aria-describedby="alabama-map-desc"
            onMouseLeave={() => setHoveredCountyId(null)}
          >
            <title id="alabama-map-title">Alabama food access by county</title>
            <desc id="alabama-map-desc">
              Choropleth map of all 67 Alabama counties, shaded by{' '}
              {SHADING_METRICS.find((metric) => metric.value === shadingMetric)?.label}. Use the arrow keys to move
              between counties and Enter to open a county&rsquo;s detail. The same figures are listed as text in the
              County Census Metrics table below the map.
            </desc>

            <path
              d={ALABAMA_OUTLINE_PATH}
              fill="#0f1117"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />

            {alabamaCounties.map((county) => {
              const geometry = alabamaCountyGeometry[county.fips];
              if (!geometry) return null;

              const isMatch = matchingIds.has(county.id);
              const isSelected = selectedCountyId === county.id;
              const isActive = activeCounty?.id === county.id;
              const isRoving = rovingCountyId === county.id;
              const fontSize = Math.max(7, Math.min(10, Math.sqrt(geometry.area) / 6));

              return (
                <g
                  key={county.id}
                  ref={(node) => {
                    if (node) countyRefs.current.set(county.id, node);
                    else countyRefs.current.delete(county.id);
                  }}
                  role="button"
                  tabIndex={isMatch && isRoving ? 0 : -1}
                  aria-label={describeCounty(county)}
                  aria-pressed={isSelected}
                  aria-hidden={!isMatch}
                  onClick={() => onSelectCounty?.(county)}
                  onKeyDown={(event) => handleKeyDown(event, county)}
                  onFocus={() => setFocusedCountyId(county.id)}
                  onBlur={() => setFocusedCountyId((current) => (current === county.id ? null : current))}
                  onMouseEnter={() => setHoveredCountyId(county.id)}
                  className="cursor-pointer focus:outline-none"
                  opacity={isMatch ? 1 : 0.18}
                  pointerEvents={isMatch ? 'auto' : 'none'}
                >
                  <path
                    d={geometry.d}
                    fill={getMetricColor(county, shadingMetric)}
                    fillOpacity={isActive ? 1 : isSelected ? 0.95 : 0.8}
                    stroke={isActive || isSelected ? '#ffffff' : 'rgba(15,17,23,0.9)'}
                    strokeWidth={isActive || isSelected ? 2 : 0.6}
                    strokeLinejoin="round"
                  />

                  {/* Second ring drawn only on keyboard focus — an SVG focus
                      indicator that survives the fill and stroke changes above. */}
                  {focusedCountyId === county.id && (
                    <path
                      d={geometry.d}
                      fill="none"
                      stroke="#f8fafc"
                      strokeWidth={3}
                      strokeDasharray="4 3"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  )}

                  <text
                    x={geometry.labelX}
                    y={geometry.labelY + fontSize / 3}
                    fill="rgba(255,255,255,0.92)"
                    fontSize={fontSize}
                    fontWeight={700}
                    textAnchor="middle"
                    pointerEvents="none"
                    aria-hidden="true"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 2 }}
                  >
                    {county.abbrev.replace(/\.$/, '')}
                  </text>

                  {county.foodAccessScore < 25 && (
                    <circle
                      cx={geometry.labelX}
                      cy={geometry.labelY - fontSize}
                      r={1.8}
                      fill="#ffffff"
                      pointerEvents="none"
                      aria-hidden="true"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {activeCounty && tooltipPosition && (
            <div
              className="absolute z-30 pointer-events-none"
              style={{ left: tooltipPosition.left, top: tooltipPosition.top, transform: tooltipPosition.transform }}
            >
              <div className="bg-[#1a1d2e]/97 border border-white/[0.18] rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-64 text-left">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-[14px] font-bold text-white leading-tight">{activeCounty.name}</h4>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {activeCounty.region} · FIPS {activeCounty.fips}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      color: getCountyColor(activeCounty.foodAccessScore),
                      backgroundColor: `${getCountyColor(activeCounty.foodAccessScore)}20`,
                      borderColor: `${getCountyColor(activeCounty.foodAccessScore)}55`,
                    }}
                  >
                    {getStatusFromScore(activeCounty.foodAccessScore)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-2xl font-black" style={{ color: getCountyColor(activeCounty.foodAccessScore) }}>
                    {activeCounty.foodAccessScore}
                  </span>
                  <span className="text-[11px] text-slate-300">/ 100 food access score</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px]">Population</p>
                    <p className="font-bold text-white">{activeCounty.population.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px]">Below poverty</p>
                    <p className="font-bold text-red-300">{activeCounty.povertyRate}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px]">Nearest pantry</p>
                    <p className="font-bold text-amber-300">{activeCounty.nearestPantryMiles} mi</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px]">Active pantries</p>
                    <p className="font-bold text-emerald-300">{activeCounty.activePantries}</p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300 flex items-center gap-1 shrink-0">
                    <ShoppingBag className="w-3 h-3 text-emerald-300" aria-hidden="true" />
                    Top need:
                  </span>
                  <span className="font-semibold text-white truncate">{activeCounty.topRequestedItem}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#12141f]/95 border border-white/[0.1] backdrop-blur-md">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-300">Severity scale:</span>
            {[
              { color: '#ef4444', label: 'Critical (< 25)' },
              { color: '#f59e0b', label: 'At risk (25–39)' },
              { color: '#3b82f6', label: 'Moderate (40–59)' },
              { color: '#10b981', label: 'Adequate (60+)' },
            ].map((entry) => (
              <div key={entry.label} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded border border-white/20"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-slate-200 font-medium">{entry.label}</span>
              </div>
            ))}
          </div>

          <span className="text-[10px] text-slate-400">
            Hover or focus a county for its metrics · Arrow keys navigate · Enter opens detail
          </span>
        </div>
      </div>
    </div>
  );
};
