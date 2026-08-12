import { describe, expect, it } from 'vitest';
import { projectCoordinate } from './alabamaProjection';
import { alabamaCountyGeometry, ALABAMA_VIEW_HEIGHT, ALABAMA_VIEW_WIDTH } from '../data/alabamaGeometry';
import { mockPantryMetrics } from '../data/mockData';

/** Straight-line distance, for "is this pin near the right county" checks. */
function distanceTo(point: { x: number; y: number }, fips: string): number {
  const geometry = alabamaCountyGeometry[fips];
  return Math.hypot(point.x - geometry.labelX, point.y - geometry.labelY);
}

describe('projectCoordinate', () => {
  it('places the state capital inside the map frame', () => {
    // Montgomery, AL.
    const point = projectCoordinate(-86.3, 32.3668);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(0);
    expect(point!.x).toBeLessThan(ALABAMA_VIEW_WIDTH);
    expect(point!.y).toBeGreaterThan(0);
    expect(point!.y).toBeLessThan(ALABAMA_VIEW_HEIGHT);
  });

  it('places Montgomery near the Montgomery County centroid', () => {
    const point = projectCoordinate(-86.3, 32.3668)!;
    // FIPS 01101 = Montgomery County. Within ~40 units of its centroid in a
    // 420x663 frame means the pin is inside the right county, not merely on
    // the right side of the state.
    expect(distanceTo(point, '01101')).toBeLessThan(40);
  });

  it('places Huntsville near Madison County', () => {
    const point = projectCoordinate(-86.5861, 34.7304)!;
    expect(distanceTo(point, '01089')).toBeLessThan(40);
  });

  it('places Mobile near Mobile County', () => {
    const point = projectCoordinate(-88.0399, 30.6954)!;
    expect(distanceTo(point, '01097')).toBeLessThan(40);
  });

  it('orders north above south and west left of east', () => {
    const huntsville = projectCoordinate(-86.5861, 34.7304)!;
    const mobile = projectCoordinate(-88.0399, 30.6954)!;
    const dothan = projectCoordinate(-85.3905, 31.2232)!;

    expect(huntsville.y).toBeLessThan(mobile.y);
    expect(mobile.x).toBeLessThan(dothan.x);
  });

  it('rejects unusable coordinates rather than drawing them at the origin', () => {
    expect(projectCoordinate(0, 0)).toBeNull();
    expect(projectCoordinate(Number.NaN, 32)).toBeNull();
    expect(projectCoordinate(-86, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('rejects coordinates far outside Alabama', () => {
    // Denver, CO.
    expect(projectCoordinate(-104.99, 39.74)).toBeNull();
  });

  it('places every demo pantry inside the map frame', () => {
    const offMap = mockPantryMetrics.filter((pantry) => {
      const point = projectCoordinate(pantry.coordinates.lng, pantry.coordinates.lat);
      return point === null;
    });
    expect(offMap.map((pantry) => pantry.name)).toEqual([]);
  });
});
