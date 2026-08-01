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
 * Boards run four bottles wider than the colour count, with two of them empty.
 * Those two extra bottles are what let the liquid start at *varying* depths
 * rather than every bottle being brim-full or bone-empty: the same volume
 * spread over more vessels leaves slack inside them. Measured, it takes the
 * share of brim-full bottles at level one from 82% down to 36%.
 *
 * The slack is free in every sense — more room to manoeuvre also makes the
 * solver converge faster, so generation got cheaper rather than dearer.
 *
 * Two bottles always start completely empty. They are what make the board
 * movable at all: with none, only a bottle whose top already matches another's
 * could ever be poured.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  const colors = Math.min(MAX_COLORS, MIN_COLORS + Math.floor((n - 1) / 2));
  return { colors, capacity: CAPACITY, bottles: colors + 4, empty: 2 };
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
