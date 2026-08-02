import { puzzleFrom } from "./clues";
import { PICTURES } from "./pictures";
import type { Picture, Puzzle } from "./types";

/**
 * Levels run small to large, and the curve is the library.
 *
 * Sorting here rather than hard-coding tier boundaries means adding a drawing
 * extends the game without editing a table. The sort is stable on equal sizes,
 * so authoring order decides the run of same-size levels.
 */
const ORDERED: readonly Picture[] = [...PICTURES].sort(
  (a, b) => a.grid.length - b.grid.length,
);

const cache = new Map<number, Puzzle>();

export function levelCount(): number {
  return ORDERED.length;
}

export function puzzleForLevel(level: number): Puzzle {
  // NaN survives every clamp — Math.floor(NaN), Math.max(1, NaN) and
  // Math.min(n, NaN) are all NaN — and would then index the array out of
  // bounds and throw. Every other extreme (+/-Infinity, 0, negatives, huge
  // values) clamps correctly, so NaN is the one case worth rejecting up front.
  const requested = Number.isFinite(level) ? Math.floor(level) : 1;
  const n = Math.min(levelCount(), Math.max(1, requested));

  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const puzzle = puzzleFrom(ORDERED[n - 1]);
  cache.set(n, puzzle);
  return puzzle;
}
