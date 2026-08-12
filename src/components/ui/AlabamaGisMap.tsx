import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Navigation, Store, Users, Package, TriangleAlert } from 'lucide-react';
import type { PantryMetric } from '../../types';
import { alabamaCounties, getCountyColor, type AlabamaCountyData } from '../../data/alabamaCounties';
import {
  ALABAMA_OUTLINE_PATH,
  ALABAMA_VIEW_BOX,
  ALABAMA_VIEW_HEIGHT,
  ALABAMA_VIEW_WIDTH,
  alabamaCountyGeometry,
} from '../../data/alabamaGeometry';
import { projectCoordinate } from '../../utils/alabamaProjection';

interface AlabamaGisMapProps {
  pantries: PantryMetric[];
  /** Counties in scope; those outside are drawn muted. */
  visibleCounties: string[];
  selectedPantryId?: string | null;
  onSelectPantry?: (pantry: PantryMetric | null) => void;
}

interface PlacedPantry {
  pantry: PantryMetric;
  x: number;
  y: number;
  radius: number;
  inScope: boolean;
}

/** Marker radius scales with families served, on a square-root scale so area
 *  — not radius — encodes the magnitude. */
function radiusFor(familiesServed: number, maxFamilies: number): number {
  if (maxFamilies <= 0) return 4;
  const normalised = Math.sqrt(Math.max(familiesServed, 0) / maxFamilies);
  return 4 + normalised * 7;
}

export const AlabamaGisMap: React.FC<AlabamaGisMapProps> = ({
  pantries,
  visibleCounties,
  selectedPantryId,
  onSelectPantry,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const markerRefs = useRef(new Map<string, SVGGElement>());

  const countyStatus = useMemo(() => {
    const lookup = new Map<string, AlabamaCountyData>();
    for (const county of alabamaCounties) {
      lookup.set(county.name.replace(/ County$/, ''), county);
    }
    return lookup;
  }, []);

  const placed = useMemo<PlacedPantry[]>(() => {
    const maxFamilies = pantries.reduce((max, pantry) => Math.max(max, pantry.familiesServed), 0);

    return pantries
      .map((pantry) => {
        const point = projectCoordinate(pantry.coordinates.lng, pantry.coordinates.lat);
        if (!point) return null;
        return {
          pantry,
          x: point.x,
          y: point.y,
          radius: radiusFor(pantry.familiesServed, maxFamilies),
          inScope: visibleCounties.includes(pantry.county),
        };
      })
      .filter((entry): entry is PlacedPantry => entry !== null)
      // Draw the largest first so small markers stay clickable on top.
      .sort((a, b) => b.radius - a.radius);
  }, [pantries, visibleCounties]);

  const inScope = useMemo(() => placed.filter((entry) => entry.inScope), [placed]);
  const unplaced = pantries.length - placed.length;

  const active = useMemo(() => {
    const id = hoveredId ?? focusedId ?? selectedPantryId;
    return placed.find((entry) => entry.pantry.id === id) ?? null;
  }, [hoveredId, focusedId, selectedPantryId, placed]);

  const rovingId =
    (selectedPantryId && inScope.some((entry) => entry.pantry.id === selectedPantryId)
      ? selectedPantryId
      : null) ??
    focusedId ??
    inScope[0]?.pantry.id ??
    null;

  const focusMarker = useCallback((id: string) => {
    setFocusedId(id);
    markerRefs.current.get(id)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGGElement>, entry: PlacedPantry) => {
      // Markers are scattered, so left/right walk them in reading order —
      // predictable beats clever when the targets are this small.
      const order = [...inScope].sort((a, b) => a.y - b.y || a.x - b.x);
      const index = order.findIndex((candidate) => candidate.pantry.id === entry.pantry.id);

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = order[(index + 1) % order.length];
        if (next) focusMarker(next.pantry.id);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const previous = order[(index - 1 + order.length) % order.length];
        if (previous) focusMarker(previous.pantry.id);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelectPantry?.(selectedPantryId === entry.pantry.id ? null : entry.pantry);
      }
    },
    [inScope, focusMarker, onSelectPantry, selectedPantryId],
  );

  const tooltip = useMemo(() => {
    if (!active) return null;
    const left = (active.x / ALABAMA_VIEW_WIDTH) * 100;
    const top = (active.y / ALABAMA_VIEW_HEIGHT) * 100;
    return {
      left: `${left}%`,
      top: `${top}%`,
      transform: `translate(${left > 55 ? '-100%' : '0'}, ${top > 60 ? '-100%' : '0'}) translate(${
        left > 55 ? '-14px' : '14px'
      }, ${top > 60 ? '-14px' : '14px'})`,
    };
  }, [active]);

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl bg-[#12141f] border border-white/[0.08] p-4 pb-16 flex items-center justify-center overflow-hidden">
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 backdrop-blur-md">
          <Navigation className="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
          <span className="text-[11px] font-bold text-indigo-200">
            {inScope.length} pantr{inScope.length === 1 ? 'y' : 'ies'} located
          </span>
        </div>

        {unplaced > 0 && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
            <TriangleAlert className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-amber-200">
              {unplaced} missing coordinates
            </span>
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {inScope.length} pantries plotted within the current county scope.
        </p>

        <div
          className="relative w-full max-w-[440px]"
          style={{ aspectRatio: `${ALABAMA_VIEW_WIDTH} / ${ALABAMA_VIEW_HEIGHT}` }}
        >
          <svg
            viewBox={ALABAMA_VIEW_BOX}
            className="w-full h-full select-none"
            role="group"
            aria-labelledby="alabama-gis-title"
            aria-describedby="alabama-gis-desc"
            onMouseLeave={() => setHoveredId(null)}
          >
            <title id="alabama-gis-title">Pantry locations across Alabama</title>
            <desc id="alabama-gis-desc">
              Geographic map showing {inScope.length} pantry locations as circular markers sized by
              families served, over a muted county basemap. Use the arrow keys to move between
              pantries and Enter to open a pantry&rsquo;s detail. The same figures are listed in the
              pantry table on the Pantry Interactions page.
            </desc>

            {/* Basemap: county fills carry a faint hint of food access so the
                markers can be read against need, not just geography. */}
            {alabamaCounties.map((county) => {
              const geometry = alabamaCountyGeometry[county.fips];
              if (!geometry) return null;
              const countyInScope = visibleCounties.includes(county.name.replace(/ County$/, ''));

              return (
                <path
                  key={county.fips}
                  d={geometry.d}
                  fill={getCountyColor(county.foodAccessScore)}
                  fillOpacity={countyInScope ? 0.16 : 0.05}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={0.5}
                  aria-hidden="true"
                />
              );
            })}

            <path
              d={ALABAMA_OUTLINE_PATH}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              aria-hidden="true"
            />

            {placed.map((entry) => {
              const { pantry } = entry;
              const isSelected = selectedPantryId === pantry.id;
              const isActive = active?.pantry.id === pantry.id;
              const isRoving = rovingId === pantry.id;
              const county = countyStatus.get(pantry.county);
              const colour = pantry.isActive ? '#34d399' : '#f87171';

              return (
                <g
                  key={pantry.id}
                  ref={(node) => {
                    if (node) markerRefs.current.set(pantry.id, node);
                    else markerRefs.current.delete(pantry.id);
                  }}
                  role="button"
                  tabIndex={entry.inScope && isRoving ? 0 : -1}
                  aria-hidden={!entry.inScope}
                  aria-pressed={isSelected}
                  aria-label={
                    `${pantry.name}, ${pantry.county} County. ` +
                    `${pantry.familiesServed.toLocaleString()} families served, ` +
                    `${pantry.totalVisits.toLocaleString()} visits, ${pantry.type}. ` +
                    `${pantry.isActive ? 'Active' : 'Offline'}.` +
                    (county ? ` County food access score ${county.foodAccessScore} out of 100.` : '')
                  }
                  onClick={() => onSelectPantry?.(isSelected ? null : pantry)}
                  onKeyDown={(event) => handleKeyDown(event, entry)}
                  onFocus={() => setFocusedId(pantry.id)}
                  onBlur={() => setFocusedId((current) => (current === pantry.id ? null : current))}
                  onMouseEnter={() => setHoveredId(pantry.id)}
                  className="cursor-pointer focus:outline-none"
                  opacity={entry.inScope ? 1 : 0.2}
                  pointerEvents={entry.inScope ? 'auto' : 'none'}
                >
                  {/* Halo, so a marker stays visible over a light county fill. */}
                  <circle cx={entry.x} cy={entry.y} r={entry.radius + 2} fill="#0f1117" fillOpacity={0.65} />
                  <circle
                    cx={entry.x}
                    cy={entry.y}
                    r={entry.radius}
                    fill={colour}
                    fillOpacity={isActive || isSelected ? 0.95 : 0.7}
                    stroke={isActive || isSelected ? '#ffffff' : 'rgba(15,17,23,0.9)'}
                    strokeWidth={isActive || isSelected ? 2 : 1}
                  />
                  {!pantry.isActive && (
                    <line
                      x1={entry.x - entry.radius * 0.6}
                      y1={entry.y - entry.radius * 0.6}
                      x2={entry.x + entry.radius * 0.6}
                      y2={entry.y + entry.radius * 0.6}
                      stroke="#0f1117"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  )}
                  {focusedId === pantry.id && (
                    <circle
                      cx={entry.x}
                      cy={entry.y}
                      r={entry.radius + 5}
                      fill="none"
                      stroke="#f8fafc"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {active && tooltip && (
            <div
              className="absolute z-30 pointer-events-none"
              style={{ left: tooltip.left, top: tooltip.top, transform: tooltip.transform }}
            >
              <div className="bg-[#1a1d2e]/97 border border-white/[0.18] rounded-2xl p-4 shadow-2xl backdrop-blur-xl w-64 text-left">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-bold text-white leading-tight">
                      {active.pantry.name}
                    </h4>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {active.pantry.county} County · {active.pantry.type}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      active.pantry.isActive
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40'
                        : 'text-red-300 bg-red-500/10 border-red-500/40'
                    }`}
                  >
                    {active.pantry.isActive ? 'Active' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Users className="w-3 h-3" aria-hidden="true" /> Families
                    </p>
                    <p className="font-bold text-white">
                      {active.pantry.familiesServed.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Store className="w-3 h-3" aria-hidden="true" /> Visits
                    </p>
                    <p className="font-bold text-white">{active.pantry.totalVisits.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] col-span-2">
                    <p className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Package className="w-3 h-3" aria-hidden="true" /> Items distributed
                    </p>
                    <p className="font-bold text-white">
                      {active.pantry.totalItemsDistributed.toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-white/[0.08]">
                  {active.pantry.address}, {active.pantry.city}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#12141f]/95 border border-white/[0.1] backdrop-blur-md">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-300">Pantry markers:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#34d399] border border-white/25" aria-hidden="true" />
              <span className="text-[11px] text-slate-200 font-medium">Active</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f87171] border border-white/25" aria-hidden="true" />
              <span className="text-[11px] text-slate-200 font-medium">Offline</span>
            </span>
            <span className="text-[11px] text-slate-300">Marker area ∝ families served</span>
          </div>
          <span className="text-[10px] text-slate-400">
            County shading shows food access · Arrow keys move between pantries
          </span>
        </div>
      </div>
    </div>
  );
};
