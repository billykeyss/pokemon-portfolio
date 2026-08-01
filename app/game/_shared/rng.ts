export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Uniform choice from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Current internal state, usable as a seed to resume this sequence. */
  state(): number;
}

/**
 * Mulberry32 — small, fast, and trivially serializable (a single uint32),
 * which is what lets a run be saved or replayed. The engine must never call
 * Math.random() directly; all randomness flows through here so the simulation
 * stays deterministic.
 */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("pick() called with empty array");
      return items[Math.floor(next() * items.length)];
    },
    state: () => s,
  };
}
