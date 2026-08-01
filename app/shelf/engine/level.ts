import { MAX_TYPES } from "./items";
import { generate } from "./generate";
import { SHELF_WIDTH, type Board, type LevelParams } from "./types";

const MIN_TYPES = 4;
const FREE_SLOTS = 3;

/**
 * Four kinds of goods across five shelves at level one, widening to eight
 * across seven.
 *
 * The real dial is how the shelf count compares to the type count, because that
 * is what decides how much gets buried. With one more shelf than types, every
 * item fits in its own slot and the whole board is visible — a clean
 * introduction. As shelves fall behind, items stack front-to-back and the
 * player has to work out what is hidden from what has not turned up yet.
 *
 * Free slots stay at three throughout. They are the only reason anything can
 * move, and taking them below three makes boards deadlock faster than they get
 * interesting.
 *
 * The curve flattens once both dials max out, around level 30. Raising it
 * further means more kinds of goods, which means more item art — the type count
 * is capped by how many are drawn, not by anything in the puzzle.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  const types = Math.min(MAX_TYPES, MIN_TYPES + Math.floor((n - 1) / 4));

  // Shelves start ahead of the type count and gradually fall behind it.
  const slack = Math.max(-2, 1 - Math.floor((n - 1) / 5));
  const shelves = Math.max(Math.ceil((types * SHELF_WIDTH + FREE_SLOTS) / SHELF_WIDTH / 2), types + slack);

  return { types, shelves, freeSlots: FREE_SLOTS };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (Math.max(1, Math.floor(level)) * 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generation runs a search, so each level is built at most once. */
const cache = new Map<number, Board>();

export function levelFor(level: number): Board {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const board = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, board);
  return board;
}
