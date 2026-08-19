/**
 * Per-module export builders.
 *
 * Every preset previously called the same exporter with the same six columns
 * and only changed the filename, so a button reading "Download IRS Form
 * 501(r) CHNA Tax Compliance Data Packet" handed back a list of pantry names.
 * Each module now produces a file whose columns match what that buyer's
 * process actually consumes.
 *
 * These are CSV. The buttons say CSV. Real PDF grant reports and co-branded
 * decks need a rendering pipeline and brand assets; until that exists the
 * print route (`window.print()`, styled by the @media print block in
 * index.css) is the honest path to paper.
 */
import type { PantryMetric } from '../types';
import type { AlabamaCountyData } from '../data/alabamaCounties';
import type { PresetId } from '../config/presets';

export interface ExportBundle {
  filename: string;
  rows: Record<string, string | number>[];
  /** Prepended as comment lines so a reviewer knows the file's provenance. */
  provenance: string[];
}

export interface ExportContext {
  pantries: PantryMetric[];
  /**
   * County census measures for the counties in scope.
   *
   * These come from the same `countyMetrics` rollup the choropleth reads, not
   * from a second hand-maintained list. There used to be two overlapping
   * datasets describing the same counties, and the exports read the one that
   * was never filtered by the agency's coverage.
   */
  counties: AlabamaCountyData[];
  countyScope: string;
  periodLabel: string;
  agencyName: string;
  /** True while any figure in the module is modelled rather than measured. */
  containsModelledFigures: boolean;
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** "Lowndes County" as the pantry directory spells it: "Lowndes". */
const plainCounty = (name: string): string => name.replace(/\s+County$/, '');

/** Index the census rows once rather than scanning them per output row. */
function countyLookup(counties: AlabamaCountyData[]): (name: string) => AlabamaCountyData | undefined {
  const byName = new Map(counties.map((county) => [plainCounty(county.name), county]));
  return (name) => byName.get(name);
}

function provenanceFor(ctx: ExportContext, purpose: string): string[] {
  const lines = [
    `AccessBelt export — ${purpose}`,
    `Agency: ${ctx.agencyName}`,
    `Scope: ${ctx.countyScope} · Period: ${ctx.periodLabel}`,
    `Generated: ${new Date().toISOString()}`,
  ];
  if (ctx.containsModelledFigures) {
    lines.push(
      'NOTICE: this export contains modelled figures not drawn from a source system. Do not cite in a filing or audit without verification.',
    );
  }
  return lines;
}

// ─── Grant & Community Impact ──────────────────────────────────────────────
// A grant reviewer needs coverage and need side by side, per county.
function buildGrantExport(ctx: ExportContext): ExportBundle {
  const byCounty = new Map<string, PantryMetric[]>();
  for (const pantry of ctx.pantries) {
    byCounty.set(pantry.county, [...(byCounty.get(pantry.county) ?? []), pantry]);
  }

  const censusFor = countyLookup(ctx.counties);

  const rows = [...byCounty.entries()].map(([county, list]) => {
    const census = censusFor(county);
    return {
      County: county,
      'Pantries Reporting': list.length,
      'Families Served': list.reduce((sum, p) => sum + p.familiesServed, 0),
      'Items Distributed': list.reduce((sum, p) => sum + p.totalItemsDistributed, 0),
      'Food Access Score': census?.foodAccessScore ?? '',
      'Percent Below Poverty': census?.povertyRate ?? '',
      'Median Income': census?.medianIncome ?? '',
      'Nearest Pantry (mi)': census?.nearestPantryMiles ?? '',
      Population: census?.population ?? '',
    };
  });

  return {
    filename: `AccessBelt_Grant_Impact_${ctx.countyScope}_${stamp()}`,
    rows,
    provenance: provenanceFor(ctx, 'Grant impact summary (USDA SNAP-Ed / HUD CDBG supporting data)'),
  };
}

// ─── SDOH Health & Medicaid ────────────────────────────────────────────────
// A payer audit is per ZIP, not per pantry — the unit of a member roster.
function buildSdohExport(ctx: ExportContext): ExportBundle {
  const rows = ctx.counties.flatMap((county) =>
    county.zipCodes.map((zip) => ({
      'ZIP Code': zip,
      County: plainCounty(county.name),
      'Food Access Score': county.foodAccessScore,
      'Vulnerability Tier': county.status,
      'Percent Below Poverty': county.povertyRate,
      'Nearest Food Resource (mi)': county.nearestPantryMiles,
      'Population Assessed': county.population,
      'Referral Endpoints Available': ctx.pantries.filter(
        (p) => p.county === plainCounty(county.name),
      ).length,
    })),
  );

  return {
    filename: `AccessBelt_SDOH_Member_Access_${ctx.countyScope}_${stamp()}`,
    rows,
    provenance: provenanceFor(ctx, 'SDOH member access audit (CMS HEDIS social needs screening support)'),
  };
}

// ─── IRS CHNA Hospital Compliance ──────────────────────────────────────────
// Form 501(r) wants documented community need and the response to it.
function buildChnaExport(ctx: ExportContext): ExportBundle {
  const rows = ctx.counties.map((county) => {
    const name = plainCounty(county.name);
    const sites = ctx.pantries.filter((p) => p.county === name);
    return {
      'Community (County)': name,
      'Population Assessed': county.population,
      'Identified Need': county.status,
      'Food Access Score': county.foodAccessScore,
      'Percent Below Poverty': county.povertyRate,
      'Median Household Income': county.medianIncome,
      'Documented Response Sites': sites.length,
      'Families Reached': sites.reduce((sum, p) => sum + p.familiesServed, 0),
      'Distance To Nearest Resource (mi)': county.nearestPantryMiles,
    };
  });

  return {
    filename: `AccessBelt_IRS_501r_CHNA_${ctx.countyScope}_${stamp()}`,
    rows,
    provenance: provenanceFor(ctx, 'IRS Form 501(r) CHNA supporting data (Schedule H)'),
  };
}

// ─── Corporate CSR ─────────────────────────────────────────────────────────
// A sponsor reports reach and growth by the county they funded.
function buildCsrExport(ctx: ExportContext): ExportBundle {
  const byCounty = new Map<string, PantryMetric[]>();
  for (const pantry of ctx.pantries) {
    byCounty.set(pantry.county, [...(byCounty.get(pantry.county) ?? []), pantry]);
  }

  const rows = [...byCounty.entries()].map(([county, list]) => ({
    'Sponsored County': county,
    'Families Reached': list.reduce((sum, p) => sum + p.familiesServed, 0),
    'Distribution Sites': list.length,
    'Items Distributed': list.reduce((sum, p) => sum + p.totalItemsDistributed, 0),
    'Average Growth Rate (%)':
      list.length === 0
        ? 0
        : Number((list.reduce((sum, p) => sum + p.growthRate, 0) / list.length).toFixed(1)),
    'Top Requested Items': list[0]?.topItems?.slice(0, 3).join('; ') ?? '',
  }));

  return {
    filename: `AccessBelt_CSR_Impact_${ctx.countyScope}_${stamp()}`,
    rows,
    provenance: provenanceFor(ctx, 'Corporate CSR community impact summary'),
  };
}

// ─── Disaster & Emergency Logistics ────────────────────────────────────────
// An EMA intake needs to route trucks: coordinates, status, capacity.
function buildDisasterExport(ctx: ExportContext): ExportBundle {
  const rows = ctx.pantries.map((pantry) => ({
    'Site Name': pantry.name,
    County: pantry.county,
    'POD Status': pantry.isActive ? 'OPERATIONAL' : 'OFFLINE',
    Latitude: pantry.coordinates.lat,
    Longitude: pantry.coordinates.lng,
    'Street Address': pantry.address,
    City: pantry.city,
    'Distribution Type': pantry.type,
    'Daily Throughput': pantry.avgDailyVisits,
    'Families Served': pantry.familiesServed,
    'Last Reported': pantry.lastUpdated,
  }));

  return {
    filename: `AccessBelt_Disaster_Logistics_${ctx.countyScope}_${stamp()}`,
    rows,
    provenance: provenanceFor(ctx, 'Emergency supply logistics feed (AEMA WebEOC / county EMA intake)'),
  };
}

const BUILDERS: Record<PresetId, (ctx: ExportContext) => ExportBundle> = {
  grant: buildGrantExport,
  sdoh: buildSdohExport,
  chna: buildChnaExport,
  csr: buildCsrExport,
  disaster: buildDisasterExport,
};

export function buildModuleExport(presetId: PresetId, ctx: ExportContext): ExportBundle {
  return BUILDERS[presetId](ctx);
}
