import { geoAlbers } from 'd3-geo';
import { ALABAMA_PROJECTION, ALABAMA_VIEW_HEIGHT, ALABAMA_VIEW_WIDTH } from '../data/alabamaGeometry';

/**
 * The same projection the county paths were generated with, rebuilt for
 * runtime use.
 *
 * Pantry coordinates arrive as lat/lng and have to land inside the correct
 * county polygon. Re-deriving the projection from the generated constants —
 * rather than eyeballing an offset — is what guarantees that.
 */
const projection = geoAlbers()
  .rotate(ALABAMA_PROJECTION.rotate)
  .center(ALABAMA_PROJECTION.center)
  .parallels(ALABAMA_PROJECTION.parallels)
  .scale(ALABAMA_PROJECTION.scale)
  .translate(ALABAMA_PROJECTION.translate);

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Project a longitude/latitude pair into the map's SVG coordinate space.
 *
 * Returns null for coordinates the projection cannot place, or that fall
 * outside the map frame — a pantry recorded at (0, 0) because someone left the
 * field blank should not be drawn in the Gulf of Mexico.
 */
export function projectCoordinate(lng: number, lat: number): ProjectedPoint | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng === 0 && lat === 0) return null;

  const result = projection([lng, lat]);
  if (!result) return null;

  const [x, y] = result;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // Allow a small margin so a pantry just over the state line still shows.
  const margin = 24;
  if (x < -margin || y < -margin) return null;
  if (x > ALABAMA_VIEW_WIDTH + margin || y > ALABAMA_VIEW_HEIGHT + margin) return null;

  return { x, y };
}
