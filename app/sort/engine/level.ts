import { generate } from "./generate";
import { CAPACITY, MAX_COLORS } from "./palette";
import type { LevelParams, Puzzle } from "./types";

const MIN_COLORS = 5;

/**
 * Seven bottles at level one, climbing to eighteen.
 *
 * Sixteen is where the colour count stops, and it is a measured limit rather
 * than an aesthetic one: generation verifies every candidate deal with a
 * search, and the state space grows fast enough that sixteen colours costs
 * ~26ms per level while eighteen costs ~720ms — a stall the player would feel
 * on every level change.
 *
 * The spare-bottle count stays at two. There used to be a squeeze level every
 * tenth level from thirty that dropped it to one, but the colour ramp now tops
 * out at level 23, so that rule could never fire again — and it cannot simply
 * be moved earlier, because a wide deal with a single spare is solvable roughly
 * once in two thousand draws, which is a stall rather than a difficulty spike.
 * The colour count carries the curve on its own.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  const colors = Math.min(MAX_COLORS, MIN_COLORS + Math.floor((n - 1) / 2));
  return { colors, free: 2, capacity: CAPACITY };
}

/**
 * Spread consecutive level numbers across the seed space, so level 8 bears no
 * resemblance to level 9 despite the inputs differing by one.
 */
export function seedForLevel(level: number): number {
  let h = Math.max(1, Math.floor(level)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generation is the one expensive call, so each level is built at most once. */
const cache = new Map<number, Puzzle>();

export function levelFor(level: number): Puzzle {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const puzzle = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, puzzle);
  return puzzle;
}
