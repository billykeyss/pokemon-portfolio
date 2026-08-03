import { generate } from "./generate";
import type { Board, LevelParams } from "./types";

/**
 * Boards grow, then tighten.
 *
 * Arrow count is the obvious dial and the weaker one: a bigger board is more to
 * look at, but if most arrows are free it is still no harder to play. The free
 * ratio is what actually decides whether the player has to search. So the count
 * climbs early to open the board up, and the ratio clamps down afterwards to
 * make it demanding.
 *
 * That ratio bottoms out at 0.58 because that is near the floor of what this
 * construction can produce: across every board size the tightest draw in a few
 * hundred sits around 0.45, and the tightest tenth around 0.58. Asking for less
 * does not make a harder level, it just makes generation exhaust its whole
 * relaxation ladder and hand back the same board seconds later.
 *
 * Two-way arrows arrive from level four. They read as easier — two ways out
 * instead of one — but the tightness bar is measured after they are added, so
 * the generator compensates and the board stays as demanding. What they
 * actually add is a decision: with sliding, the end you send one from decides
 * which cells it leaves blocked.
 *
 * Track length climbs too, and it does double duty: longer bodies cover more
 * cells, so they block more of the board, and a winding route is harder to
 * trace by eye than a single square is.
 *
 * Fill starts high and climbs to just under three quarters. The ceiling is
 * measured rather than chosen: laying arrows down in reverse removal order tops
 * out around 0.76 on the largest board, because every new track needs a clear
 * run to an edge and those get scarce as the board fills. Asking for more than
 * the construction can deliver just makes generation spin.
 *
 * The opening levels start nearly as packed as the late ones, because fill is
 * what makes the board read as a maze rather than as marks on paper. Early
 * levels are made easy by the free ratio, not by leaving the board half empty.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));

  const size = n < 5 ? 7 : n < 12 ? 9 : n < 22 ? 11 : 13;
  const maxLength = Math.min(7, 3 + Math.floor((n - 1) / 4));
  const fillTarget = Math.min(0.74, 0.62 + n * 0.008);
  const maxFreeRatio = Math.max(0.58, 0.73 - n * 0.005);

  // Held back for the first few levels so the plain rule is learned before the
  // exception to it, then climbing to about a quarter of the board.
  const twoWayShare = n < 4 ? 0 : Math.min(0.26, (n - 3) * 0.02);

  return { size, maxLength, fillTarget, maxFreeRatio, twoWayShare };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (Math.max(1, Math.floor(level)) * 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generation rejects a lot of draws, so each level is built at most once. */
const cache = new Map<number, Board>();

export function levelFor(level: number): Board {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const board = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, board);
  return board;
}
