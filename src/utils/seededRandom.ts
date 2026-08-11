/**
 * mulberry32 — a small, fast, seedable PRNG.
 *
 * Used so demonstration data is identical on every load: stable for
 * screenshots in the grant deck, stable across two people looking at the same
 * dashboard, and stable for tests. Not for anything security-related.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
