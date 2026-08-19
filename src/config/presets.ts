/**
 * The five repackaged view presets.
 *
 * One dashboard, five buyer profiles. Selecting a preset re-points the KPI
 * row, the analytics emphasis and the primary export CTA at whatever that
 * buyer is actually purchasing — a grant officer and a Medicaid compliance
 * analyst are looking at the same underlying pantry data for entirely
 * different reasons.
 *
 * Everything a preset changes is declared here rather than branched on inside
 * components, so adding a sixth buyer is a new entry in this file and nothing
 * else.
 *
 * A note on the glyphs: presets carry lucide icons, not emoji. These screens
 * are sold to hospital compliance officers and state emergency management —
 * an emoji in an IRS Form 501(r) export button reads as a consumer app. To
 * switch, replace `icon` with a string and render it directly; the type is
 * the only thing holding it to a component.
 */
import {
  BarChart3,
  HeartPulse,
  ClipboardList,
  Building2,
  Siren,
  Users,
  Store,
  Package,
  AlertTriangle,
  ShieldCheck,
  Repeat,
  TrendingDown,
  CalendarRange,
  HandCoins,
  MapPinned,
  Radio,
  PackageX,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '../types';

export type PresetId = 'grant' | ModuleId;

/**
 * What every agency gets before buying anything. Pricing the base platform
 * low and selling outcomes on top is the whole shape of the model — the Grant
 * view is what proves the data is worth paying for.
 */
export const REGIONAL_PRO_PLATFORM = {
  name: "Regional Pro — Multi-County & Statewide Access",
  includes: "All 67 Alabama counties, multi-county demand comparison, predictive stockout alerts",
  monthlyPrice: 1500,
  annualPrice: 18_000,
};

export const BASE_PLATFORM = {
  name: "AccessBelt Base Platform",
  includes: "1 primary assigned county of your choice (Montgomery default for demo)",
  monthlyPrice: 400,
  annualPrice: 4_000,
  extraCountyPriceMonthly: 150,
  extraCountyPriceAnnual: 1_500,
} as const;

export const PRESETS_PLATFORM_V2 = {
  name: 'AccessBelt Base Platform',
  includes: 'Grant & Community Impact view, all counties assigned to your agency',
  monthlyPrice: 400,
  annualPrice: 4_000,
} as const;

/** Accent classes are written out in full — Tailwind cannot see interpolated names. */
export interface AccentClasses {
  text: string;
  bg: string;
  border: string;
  dot: string;
  solid: string;
  solidHover: string;
  glow: string;
}

export const ACCENTS: Record<string, AccentClasses> = {
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    solid: 'bg-emerald-500',
    solidHover: 'hover:bg-emerald-400',
    glow: 'metric-glow-emerald',
  },
  sky: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
    solid: 'bg-sky-500',
    solidHover: 'hover:bg-sky-400',
    glow: 'metric-glow-blue',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400',
    solid: 'bg-violet-500',
    solidHover: 'hover:bg-violet-400',
    glow: 'metric-glow-indigo',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    solid: 'bg-amber-500',
    solidHover: 'hover:bg-amber-400',
    glow: 'metric-glow-amber',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
    solid: 'bg-rose-500',
    solidHover: 'hover:bg-rose-400',
    glow: 'metric-glow-rose',
  },
};

/** Numbers a KPI tile can be built from, computed once by the page. */
export interface PresetMetrics {
  familiesServed: number;
  itemsDistributed: number;
  activePantries: number;
  totalPantries: number;
  foodDesertScore: number;
  countyCount: number;
  pantriesInScope: number;
  familiesTrend: number;
  itemsTrend: number;
  trendLabel: string;
}

export interface PresetKpi {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  glow: string;
  /** Renders in a monospace face — coordinates, dollar figures, exact IDs. */
  mono?: boolean;
  /**
   * True when the figure is modelled rather than measured.
   *
   * Several module KPIs (HEDIS screening rates, closed-loop referral counts,
   * community investment dollars) have no source system behind them yet and
   * are derived from pantry activity by a coefficient. Labels like "CMS HEDIS
   * compliance" imply an audited number, so anything modelled is marked in
   * the UI. A fabricated coefficient reaching a payer audit or a tax filing
   * is a liability, not a rounding error.
   */
  illustrative?: boolean;
}

export interface ViewPreset {
  id: PresetId;
  /** Full name, used in menus and the upgrade modal. */
  name: string;
  /** Condensed name for the header chip. */
  shortName: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;

  /** `included` ships with the base platform; `add-on` is purchased. */
  access: 'included' | 'add-on';
  /** Annual contract range shown to the buyer. */
  priceLow: number;
  priceHigh: number;
  /** How the contract is counted — some modules sell per report, not per year. */
  priceUnit: 'year' | 'report';

  buyer: string;
  priceBand: string;
  summary: string;
  /** What this buyer is actually looking at. Drives the focus strip. */
  focus: string[];

  exportLabel: string;
  exportIcon: LucideIcon;
  exportFilename: string;
  /** Sits under the export button — what the file is accepted for. */
  exportNote: string;

  buildKpis: (m: PresetMetrics) => PresetKpi[];
}

const pct = (n: number) => `${Math.round(n)}%`;

export const VIEW_PRESETS: ViewPreset[] = [
  // ── 1. Grant & Community Impact ──────────────────────────────────────────
  {
    id: 'grant',
    name: 'Grant & Community Impact',
    shortName: 'Grant & Impact',
    icon: BarChart3,
    accent: 'emerald',
    access: 'included',
    priceLow: 0,
    priceHigh: 0,
    priceUnit: 'year',
    buyer: 'United Way River Region · Community Action Agencies',
    priceBand: 'Included in base platform',
    summary:
      'County-level food desert coverage, unmet demand and poverty metrics, formatted for grant applications.',
    focus: [
      'County food desert heatmap',
      'Unmet demand statistics',
      'ZIP poverty metrics',
      'Pantry coverage %',
    ],
    exportLabel: 'Export grant impact data (CSV)',
    exportIcon: BarChart3,
    exportFilename: 'AccessBelt_Grant_Impact_Report',
    exportNote: 'County coverage and need, for USDA SNAP-Ed and HUD CDBG applications. Use Print for a paper report.',
    buildKpis: (m) => [
      {
        label: 'Families Served',
        value: m.familiesServed,
        trend: m.familiesTrend,
        trendLabel: m.trendLabel,
        icon: Users,
        glow: 'metric-glow-emerald',
      },
      {
        label: 'Active Pantries in Scope',
        value: `${m.activePantries} / ${m.totalPantries}`,
        icon: Store,
        glow: 'metric-glow-indigo',
      },
      {
        label: 'Items Distributed',
        value: m.itemsDistributed,
        trend: m.itemsTrend,
        trendLabel: m.trendLabel,
        icon: Package,
        glow: 'metric-glow-amber',
      },
      {
        label: 'Food Desert Score',
        value: `${m.foodDesertScore}/100`,
        icon: AlertTriangle,
        glow: 'metric-glow-blue',
      },
    ],
  },

  // ── 2. SDOH Health & Medicaid Audit ──────────────────────────────────────
  {
    id: 'sdoh',
    name: 'SDOH Health & Medicaid Audit',
    shortName: 'SDOH & Medicaid',
    icon: HeartPulse,
    accent: 'sky',
    access: 'add-on',
    priceLow: 25_000,
    priceHigh: 75_000,
    priceUnit: 'year',
    buyer: 'Blue Cross Blue Shield of AL · Viva Health · UnitedHealthcare',
    priceBand: '$25k–$75k / yr',
    summary:
      'Member ZIP vulnerability overlay, HEDIS social needs screening compliance, and closed-loop referral tracking.',
    focus: [
      'Member ZIP vulnerability overlay',
      'CMS HEDIS screening compliance',
      'Closed-loop referral counter',
      'Plan network gap analysis',
    ],
    exportLabel: 'Export SDOH member access audit (CSV)',
    exportIcon: HeartPulse,
    exportFilename: 'AccessBelt_SDOH_Member_Access_Audit',
    exportNote: 'One row per ZIP, aligned to CMS HEDIS social needs screening',
    buildKpis: (m) => [
      {
        label: 'Members in Vulnerable ZIPs',
        value: Math.round(m.familiesServed * 2.4),
        trend: m.familiesTrend,
        trendLabel: m.trendLabel,
        icon: HeartPulse,
        glow: 'metric-glow-blue',
              illustrative: true,
      },
      {
        label: 'HEDIS Screening Compliance',
        value: pct(Math.min(97, 62 + m.activePantries * 1.6)),
        icon: ShieldCheck,
        glow: 'metric-glow-emerald',
              illustrative: true,
      },
      {
        label: 'Closed-Loop Referrals',
        value: Math.round(m.pantriesInScope * 148),
        trend: m.itemsTrend,
        trendLabel: m.trendLabel,
        icon: Repeat,
        glow: 'metric-glow-indigo',
              illustrative: true,
      },
      {
        label: 'Network Access Gap',
        value: `${Math.max(0, 100 - m.foodDesertScore)}/100`,
        icon: TrendingDown,
        glow: 'metric-glow-amber',
              illustrative: true,
      },
    ],
  },

  // ── 3. IRS CHNA Hospital Compliance ──────────────────────────────────────
  {
    id: 'chna',
    name: 'IRS CHNA Hospital Compliance Audit',
    shortName: 'IRS CHNA Audit',
    icon: ClipboardList,
    accent: 'violet',
    access: 'add-on',
    priceLow: 10_000,
    priceHigh: 25_000,
    priceUnit: 'report',
    buyer: 'Baptist Health Montgomery · Jackson Hospital · UAB Medicine',
    priceBand: '$10k–$25k / report',
    summary:
      'Service-radius food security trends and community investment logging for the triennial CHNA filing.',
    focus: [
      '25-mile service radius selector',
      '3-year food security trend',
      'Form 501(r) investment log',
      'Community benefit attribution',
    ],
    exportLabel: 'Export IRS 501(r) CHNA data (CSV)',
    exportIcon: ClipboardList,
    exportFilename: 'AccessBelt_IRS_501r_CHNA_Packet',
    exportNote: 'Triennial CHNA supporting data, Form 501(r) Schedule H',
    buildKpis: (m) => [
      {
        label: 'Service Radius Population',
        value: Math.round(m.familiesServed * 3.1),
        icon: MapPinned,
        glow: 'metric-glow-indigo',
              illustrative: true,
      },
      {
        label: '3-Year Food Security Trend',
        value: `${m.familiesTrend > 0 ? '+' : ''}${(m.familiesTrend * 2.4).toFixed(1)}%`,
        icon: CalendarRange,
        glow: 'metric-glow-emerald',
              illustrative: true,
      },
      {
        label: 'Community Investment Logged',
        value: `$${(m.itemsDistributed * 2.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        icon: HandCoins,
        glow: 'metric-glow-amber',
        mono: true,
              illustrative: true,
      },
      {
        label: 'Documented CHNA Sites',
        value: `${m.activePantries} / ${m.totalPantries}`,
        icon: ClipboardList,
        glow: 'metric-glow-blue',
      },
    ],
  },

  // ── 4. Corporate CSR Sponsor Overview ────────────────────────────────────
  {
    id: 'csr',
    name: 'Corporate CSR Sponsor Overview',
    shortName: 'Corporate CSR',
    icon: Building2,
    accent: 'amber',
    access: 'add-on',
    priceLow: 5_000,
    priceHigh: 20_000,
    priceUnit: 'year',
    buyer: 'Alabama Power Foundation · Regions Bank Foundation · Publix Charities',
    priceBand: '$5k–$20k / yr',
    summary:
      'Co-branded reach and growth reporting for foundation sponsors and corporate giving committees.',
    focus: [
      'Total families reached counter',
      'Co-branded sponsor header',
      'Sponsored county growth',
      'Volunteer hours attribution',
    ],
    exportLabel: 'Export CSR impact summary (CSV)',
    exportIcon: Building2,
    exportFilename: 'AccessBelt_CSR_Impact_Deck',
    exportNote: 'Reach and growth per sponsored county. Use Print for a branded handout.',
    buildKpis: (m) => [
      {
        label: 'Total Families Reached',
        value: m.familiesServed,
        trend: m.familiesTrend,
        trendLabel: m.trendLabel,
        icon: Users,
        glow: 'metric-glow-amber',
      },
      {
        label: 'Sponsored Counties',
        value: m.countyCount,
        icon: MapPinned,
        glow: 'metric-glow-emerald',
      },
      {
        label: 'Meals Funded',
        value: Math.round(m.itemsDistributed * 1.18),
        trend: m.itemsTrend,
        trendLabel: m.trendLabel,
        icon: Package,
        glow: 'metric-glow-indigo',
              illustrative: true,
      },
      {
        label: 'Sponsor Cost Per Family',
        value: `$${(42_000 / Math.max(1, m.familiesServed)).toFixed(2)}`,
        icon: HandCoins,
        glow: 'metric-glow-blue',
        mono: true,
              illustrative: true,
      },
    ],
  },

  // ── 5. Disaster & Emergency Logistics ────────────────────────────────────
  {
    id: 'disaster',
    name: 'Disaster & Emergency Logistics Feed',
    shortName: 'Disaster Logistics',
    icon: Siren,
    accent: 'rose',
    access: 'add-on',
    priceLow: 15_000,
    priceHigh: 50_000,
    priceUnit: 'year',
    buyer: 'Alabama Emergency Management Agency · County EMAs',
    priceBand: '$15k–$50k / yr',
    summary:
      'Live points of distribution status, stockout red zones, and the emergency supply request stream.',
    focus: [
      'Live POD status map',
      'Crisis stockout red zones',
      'Emergency SOS alert stream',
      'Resupply routing priority',
    ],
    exportLabel: 'Export disaster logistics feed (CSV)',
    exportIcon: Siren,
    exportFilename: 'AccessBelt_Disaster_Logistics_Feed',
    exportNote: 'Site coordinates and POD status for AEMA WebEOC and county EMA intake',
    buildKpis: (m) => [
      {
        label: 'Points of Distribution Live',
        value: `${m.activePantries} / ${m.totalPantries}`,
        icon: Radio,
        glow: 'metric-glow-emerald',
      },
      {
        label: 'Stockout Red Zones',
        value: Math.max(0, m.totalPantries - m.activePantries),
        icon: PackageX,
        glow: 'metric-glow-rose',
              illustrative: true,
      },
      {
        label: 'Open SOS Requests',
        value: Math.round(m.pantriesInScope * 1.7),
        icon: Siren,
        glow: 'metric-glow-amber',
              illustrative: true,
      },
      {
        label: 'Population at Risk',
        value: Math.round(m.familiesServed * 2.8),
        trend: m.familiesTrend,
        trendLabel: m.trendLabel,
        icon: AlertTriangle,
        glow: 'metric-glow-blue',
              illustrative: true,
      },
    ],
  },
];

export const DEFAULT_PRESET_ID: PresetId = 'grant';

/** Valid `?view=` values, for validating the query string. */
export const VIEW_PRESET_IDS: PresetId[] = VIEW_PRESETS.map((preset) => preset.id);

export function getPreset(id: PresetId): ViewPreset {
  return VIEW_PRESETS.find((p) => p.id === id) ?? VIEW_PRESETS[0];
}

/**
 * An account with no recorded entitlements gets the base platform only. An
 * entitlement check has to fail closed — defaulting an unknown account to
 * "unlocked" would hand away every paid module.
 */
export function isPresetUnlocked(preset: ViewPreset, entitlements: ModuleId[] | undefined): boolean {
  if (preset.access === 'included') return true;
  return (entitlements ?? []).includes(preset.id as ModuleId);
}

/** Formats a module's contract range for display. */
export function formatPriceBand(preset: ViewPreset): string {
  if (preset.access === 'included') return preset.priceBand;
  const fmt = (n: number) => `$${(n / 1000).toLocaleString()}k`;
  return `${fmt(preset.priceLow)}–${fmt(preset.priceHigh)} / ${preset.priceUnit}`;
}
