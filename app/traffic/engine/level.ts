import { generate } from "./generate";
import { exitRowFor, type Board, type LevelParams } from "./types";

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
 * Generation runs in a worker, so spending more of it costs only wall-clock —
 * it no longer freezes the board. Measured at twelve vehicles: sixteen
 * attempts averages par 10.5, thirty averages 11.2, forty-five 11.7, sixty
 * 12.3, each step costing roughly another second.
 *
 * It stops at thirty, and the limit is now the one case where the wait is
 * *visible*. Ordinary progression never sees it — the next board is built while
 * the current one is played, and a level at par eleven takes far longer to
 * solve than to build. Jumping straight to an unbuilt level from level select
 * does see it, so the budget is set by how long that placeholder is tolerable.
 *
 * At thirty that placeholder shows for about two seconds on average and four at
 * its worst, measured in a browser worker on the densest late levels — sixty
 * would roughly double both for about one more par point. Measure this in the
 * browser, not in Node: the two agree on most levels, but Node ran the worst
 * ones a second faster, so tuning against it alone understates the wait.
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
    attempts: Math.min(30, 12 + Math.floor(n * 1.2)),
  };
}

/** An empty board of the right shape, for before the real one has been built. */
export function blankBoard(level: number): Board {
  const { size } = paramsForLevel(level);
  return { size, exitRow: exitRowFor(size), vehicles: [] };
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
