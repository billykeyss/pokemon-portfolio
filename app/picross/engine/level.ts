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
  // NaN, and only NaN, has to be rejected before the clamp: it survives
  // Math.floor, Math.max and Math.min alike, so it would reach the array as an
  // index and throw. Both infinities are safe to clamp normally — Infinity
  // lands on the last level and -Infinity on the first — so testing
  // Number.isFinite here instead would quietly send Infinity to level one.
  const requested = Number.isNaN(level) ? 1 : level;
  const n = Math.min(levelCount(), Math.max(1, Math.floor(requested)));

  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const puzzle = puzzleFrom(ORDERED[n - 1]);
  cache.set(n, puzzle);
  return puzzle;
}
