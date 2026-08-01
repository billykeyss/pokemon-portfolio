import { generate } from "./generate";
import { MAX_TYPES } from "./items";
import type { LevelParams, Shelf } from "./types";

const MIN_TYPES = 3;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 6;

/**
 * Three goods across three shelves at level one, widening to eight across six.
 *
 * The tray tightens as well, and that is the real difficulty dial: with seven
 * slots almost any order of takes works out, while at five the player has to
 * think about what a take strands behind it. It never drops below five, because
 * four leaves too little room to recover from a single wrong pick.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  return {
    types: Math.min(MAX_TYPES, MIN_TYPES + Math.floor((n - 1) / 3)),
    columns: Math.min(MAX_COLUMNS, MIN_COLUMNS + Math.floor((n - 1) / 4)),
    depth: 0,
    traySize: n < 6 ? 7 : n < 14 ? 6 : 5,
  };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (Math.max(1, Math.floor(level)) * 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generation runs a search, so each level is built at most once. */
const cache = new Map<number, Shelf>();

export function levelFor(level: number): Shelf {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const shelf = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, shelf);
  return shelf;
}
