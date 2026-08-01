import { generate } from "./generate";
import { CAPACITY, MAX_COLORS } from "./palette";
import type { LevelParams, Puzzle } from "./types";

const MIN_COLORS = 3;

/**
 * Three colours and two spare bottles at level one, widening to twelve colours
 * by level 46 and flat thereafter. From level 30, every tenth level is a squeeze
 * with a single spare.
 *
 * The squeeze stops once the colour count maxes out. Not for difficulty reasons
 * — measured, a random twelve-colour deal with one spare bottle is solvable
 * roughly one time in two thousand, so generating one costs a visible pause.
 * Past that point the colour count is carrying the difficulty anyway.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  const colors = Math.min(MAX_COLORS, MIN_COLORS + Math.floor((n - 1) / 5));
  const squeeze = n >= 30 && n % 10 === 0 && colors < MAX_COLORS;
  return { colors, free: squeeze ? 1 : 2, capacity: CAPACITY };
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
