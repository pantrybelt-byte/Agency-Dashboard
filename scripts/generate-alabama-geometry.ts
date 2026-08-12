/**
 * Generates real Alabama county geometry from US Census cartographic boundary
 * data and writes it to `src/data/alabamaGeometry.ts`.
 *
 * Source: the `us-atlas` package, which ships the Census Bureau's 1:10m
 * cartographic boundary files as TopoJSON, keyed by 5-digit FIPS code. Our
 * county dataset already carries those same FIPS codes, so they join directly.
 *
 * Projection and path generation happen HERE, at build time, so that no
 * projection library ships to the browser — the app renders plain SVG `d`
 * strings.
 *
 * Re-run with: npm run generate:geometry
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoAlbers, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';

const require = createRequire(import.meta.url);

const ALABAMA_FIPS_PREFIX = '01';
/** Target width of the generated viewBox, in SVG user units. */
const TARGET_WIDTH = 420;
/** Padding inside the viewBox so stroked borders are not clipped. */
const PADDING = 6;
/** Decimal places kept in path coordinates. One is ~0.1px — visually lossless. */
const PRECISION = 1;

interface CountyTopoGeometry {
  id?: string | number;
  properties?: { name?: string };
}

function roundPath(d: string): string {
  return d.replace(/-?\d+\.?\d*/g, (n) => String(Number(Number(n).toFixed(PRECISION))));
}

function main(): void {
  const countiesTopo = require('us-atlas/counties-10m.json');
  const statesTopo = require('us-atlas/states-10m.json');

  const countyGeometries = (countiesTopo.objects.counties.geometries as CountyTopoGeometry[]).filter(
    (geometry) => String(geometry.id).startsWith(ALABAMA_FIPS_PREFIX),
  );

  if (countyGeometries.length !== 67) {
    throw new Error(`Expected 67 Alabama counties, found ${countyGeometries.length}`);
  }

  const countyCollection = feature(countiesTopo, {
    type: 'GeometryCollection',
    geometries: countyGeometries,
  } as never) as unknown as GeoJSON.FeatureCollection;

  // Merging the county arcs yields a state outline whose border coincides
  // exactly with the county edges — cleaner than overlaying the separate
  // state file, which is generalised independently and would misalign.
  const stateOutline = merge(countiesTopo, countyGeometries as never) as unknown as GeoJSON.MultiPolygon;

  void statesTopo;

  // Albers equal-area conic, tuned to Alabama's latitude band. Equal-area
  // matters for a choropleth: readers judge magnitude partly by area, so a
  // projection that inflates the north would misrepresent the data.
  const projection = geoAlbers().rotate([86.8, 0]).center([0, 32.8]).parallels([30.2, 34.8]);

  // Fit once to a square to learn the true aspect ratio, then refit to a box
  // of that shape so the generated viewBox has no dead margin.
  projection.fitSize([1000, 1000], countyCollection);
  const probeBounds = geoPath(projection).bounds(countyCollection);
  const aspect = (probeBounds[1][0] - probeBounds[0][0]) / (probeBounds[1][1] - probeBounds[0][1]);
  const height = Math.round(TARGET_WIDTH / aspect);

  projection.fitExtent(
    [
      [PADDING, PADDING],
      [TARGET_WIDTH - PADDING, height - PADDING],
    ],
    countyCollection,
  );

  const pathBuilder = geoPath(projection);

  const entries = countyCollection.features
    .map((countyFeature) => {
      const fips = String(countyFeature.id);
      const d = pathBuilder(countyFeature);
      if (!d) throw new Error(`No path generated for FIPS ${fips}`);
      const [cx, cy] = pathBuilder.centroid(countyFeature);
      return {
        fips,
        name: String((countyFeature.properties as { name?: string } | null)?.name ?? ''),
        d: roundPath(d),
        cx: Number(cx.toFixed(PRECISION)),
        cy: Number(cy.toFixed(PRECISION)),
        // Projected area in square SVG units. Used to decide whether a county
        // is large enough to carry a legible label at 1x zoom.
        area: Math.round(pathBuilder.area(countyFeature)),
      };
    })
    .sort((a, b) => a.fips.localeCompare(b.fips));

  const outlinePath = roundPath(pathBuilder(stateOutline) ?? '');

  // Emit the fitted projection so the client can place live lat/lng markers in
  // exactly this coordinate space. Rebuilding the projection from these values
  // is what guarantees a pantry pin lands inside the right county polygon.
  const [translateX, translateY] = projection.translate();
  const projectionMeta = {
    rotate: projection.rotate().slice(0, 2) as [number, number],
    center: projection.center() as [number, number],
    parallels: projection.parallels() as [number, number],
    scale: projection.scale(),
    translate: [translateX, translateY] as [number, number],
  };

  const body = entries
    .map(
      (entry) =>
        `  '${entry.fips}': {\n` +
        `    name: ${JSON.stringify(entry.name)},\n` +
        `    labelX: ${entry.cx},\n` +
        `    labelY: ${entry.cy},\n` +
        `    area: ${entry.area},\n` +
        `    d: '${entry.d}',\n` +
        `  },`,
    )
    .join('\n');

  const output = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Produced by scripts/generate-alabama-geometry.ts from the us-atlas package,
// which packages the US Census Bureau 1:10,000,000 cartographic boundary files.
// Regenerate with: npm run generate:geometry
//
// Projection: Albers equal-area conic, rotate [86.8, 0], center [0, 32.8],
// standard parallels [30.2, 34.8], fitted to the viewBox below.

export interface CountyGeometry {
  /** Census county name, without the "County" suffix. */
  name: string;
  /** Projected centroid X, for label placement. */
  labelX: number;
  /** Projected centroid Y, for label placement. */
  labelY: number;
  /** Projected area in square SVG units. Drives label-visibility decisions. */
  area: number;
  /** SVG path data in the coordinate system of ALABAMA_VIEW_BOX. */
  d: string;
}

export const ALABAMA_VIEW_BOX = '0 0 ${TARGET_WIDTH} ${height}';
export const ALABAMA_VIEW_WIDTH = ${TARGET_WIDTH};
export const ALABAMA_VIEW_HEIGHT = ${height};

/** Outline of the state, derived by merging the 67 county polygons. */
export const ALABAMA_OUTLINE_PATH = '${outlinePath}';

/**
 * The exact projection these paths were generated with. Rebuild it at runtime
 * (see src/utils/alabamaProjection.ts) to place lat/lng points in this same
 * coordinate space.
 */
export const ALABAMA_PROJECTION = {
  rotate: [${projectionMeta.rotate[0]}, ${projectionMeta.rotate[1]}] as [number, number],
  center: [${projectionMeta.center[0]}, ${projectionMeta.center[1]}] as [number, number],
  parallels: [${projectionMeta.parallels[0]}, ${projectionMeta.parallels[1]}] as [number, number],
  scale: ${projectionMeta.scale},
  translate: [${projectionMeta.translate[0]}, ${projectionMeta.translate[1]}] as [number, number],
};

/** County geometry keyed by 5-digit Census FIPS code. */
export const alabamaCountyGeometry: Record<string, CountyGeometry> = {
${body}
};
`;

  writeFileSync(new URL('../src/data/alabamaGeometry.ts', import.meta.url), output, 'utf8');

  console.log(`Wrote 67 counties. viewBox 0 0 ${TARGET_WIDTH} ${height} (aspect ${aspect.toFixed(3)}).`);
}

main();
