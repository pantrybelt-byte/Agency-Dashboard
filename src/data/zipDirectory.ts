/**
 * ZIP code reference data: which community a ZIP names, and which county it
 * sits in.
 *
 * This is geographic reference data, not measurement — a ZIP's county does not
 * change when someone picks a different date range, and a community's name
 * does not change when a pantry reports. It therefore lives in the bundle
 * alongside the county geometry rather than in a Firestore collection that
 * would be read on every query to return the same answer.
 *
 * The rollups carry families-served counts keyed by ZIP; this supplies the
 * labels those counts are displayed under.
 */
import { mockDemographics } from './mockData';

export interface ZipMeta {
  community: string;
  county: string;
}

export const ZIP_DIRECTORY: Map<string, ZipMeta> = new Map(
  mockDemographics.zipCodeBreakdown.map((entry) => [
    entry.zip,
    { community: entry.community, county: entry.county },
  ]),
);

/** Falls back to the bare ZIP so an unmapped code still renders as itself. */
export function zipMeta(zip: string): ZipMeta {
  return ZIP_DIRECTORY.get(zip) ?? { community: zip, county: '' };
}
