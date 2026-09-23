/** Small seeded random generator (mulberry32). Same seed → same sequence, so tests are repeatable. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

/** Pauses before each stimulus, generated in advance: uniform between min and max, whole ms. */
export function isiSequence(seed: number, count: number, minMs: number, maxMs: number): number[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => Math.round(minMs + random() * (maxMs - minMs)));
}
