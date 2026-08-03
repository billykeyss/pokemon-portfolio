import { generate } from "./generate";
import type { Board, LevelParams } from "./types";

const SIZE = 6;

/**
 * Four vehicles at level one, reaching a full board by level thirteen.
 *
 * Density is the dial that works, and twelve is its measured ceiling — not a
 * chosen one. Mean par climbs 6.7 -> 7.5 -> 9.6 across eight, ten and twelve
 * vehicles; thirteen is both *worse* (8.7) and slower, and at fourteen the
 * generator can no longer place them all on thirty-six cells.
 *
 * Board size looks like the obvious way past that cap and is not: an 8x8 with
 * twelve vehicles yields pars of five to six, below what a 6x6 with seven
 * manages, and costs 3.4s a board. Spreading the same traffic over more room
 * gives every vehicle somewhere to go, which is the opposite of a jam.
 *
 * So past level thirteen the only dial left is how hard generation looks. It
 * keeps the hardest draw it finds, so more draws means a higher expected par at
 * linear cost: 14 attempts averages par 9.8, 30 averages 10.9, 100 averages
 * 12.6 but takes five seconds. The budget climbs with the level, because the
 * next board is built while the current one is being played and a hard level
 * takes far longer to solve than to build.
 *
 * It stops at sixteen, and the limit is the *prefetch*, not the wait. Building
 * happens on the main thread, so however well hidden it is behind play, it
 * still freezes the board for as long as it runs. A dense board already costs
 * most of a second to draw once, and the budget multiplies that: thirty
 * attempts buys about one par point and freezes the board for two seconds to
 * do it. Moving generation to a worker is what would unlock the larger budget;
 * until then density carries the difficulty and this stays small.
 *
 * The move demand is close to inert as a filter — asking for nine and asking
 * for eighteen produce the same boards — but it still decides when generation
 * may stop early. A low demand lets an easy level bail on the first good draw;
 * a high one makes a late level spend its whole budget.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  return {
    size: SIZE,
    vehicles: Math.min(12, 4 + Math.floor((n - 1) / 1.5)),
    minMoves: Math.min(14, 3 + Math.floor((n - 1) / 1.5)),
    attempts: Math.min(16, 12 + Math.floor(n / 4)),
  };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (Math.max(1, Math.floor(level)) * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

/** Generation runs a breadth-first search, so each level is built at most once. */
const cache = new Map<number, Board>();

export function levelFor(level: number): Board {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const board = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, board);
  return board;
}
