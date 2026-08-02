/** 1..9. Zero is not a digit — it is the absence of one. */
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** A board cell: a digit, or 0 for empty. */
export type Cell = 0 | Digit;

/** Exactly 81 cells, row-major. */
export type Grid = readonly Cell[];

/** Index into a Grid, 0..80. */
export type Idx = number;

export type Tier = "easy" | "medium" | "hard" | "expert";
export const TIERS: readonly Tier[] = ["easy", "medium", "hard", "expert"];

export type UnitKind = "row" | "col" | "box";

/** One of the 27 groups of nine cells that must each hold 1..9 exactly once. */
export interface Unit {
  kind: UnitKind;
  /** 0..8 within its kind. */
  index: number;
}

export interface Puzzle {
  givens: Grid;
  solution: Grid;
  tier: Tier;
  seed: number;
}

/**
 * Givens and player entries are kept apart rather than merged into one grid.
 * Merging saves an array and immediately makes "may the player erase this?"
 * ambiguous — the one question the input layer asks most.
 */
export interface Board {
  puzzle: Puzzle;
  entries: Grid;
}
