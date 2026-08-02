/**
 * A cell's state.
 *
 * Read two ways. In the solver, BLANK means "deduced empty". On the player's
 * board it means "the player marked this empty" — their own bookkeeping, never
 * validated. FILLED means the same thing in both.
 */
export type CellState = 0 | 1 | 2;

export const UNKNOWN: CellState = 0;
export const FILLED: CellState = 1;
export const BLANK: CellState = 2;

/** Run lengths along one line, in order. An empty line has no runs. */
export type Clue = readonly number[];

/** Hand-authored source art. `#` is a shaded cell, anything else is blank. */
export interface Picture {
  id: string;
  name: string;
  /** Colour the shaded cells take on the reveal. */
  colour: string;
  /** Square grid of equal-length rows. */
  grid: readonly string[];
}

export interface Puzzle {
  id: string;
  name: string;
  colour: string;
  size: number;
  /** Row-major, `FILLED` or `BLANK`, never `UNKNOWN`. */
  solution: Uint8Array;
  rowClues: readonly Clue[];
  colClues: readonly Clue[];
}

/** Row-major `CellState` per cell, length `size * size`. */
export type Board = Uint8Array;

export const FILL_CHAR = "#";
