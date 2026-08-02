import { CELLS, PEERS } from "./grid";
import type { Board, Cell, Digit, Grid, Idx, Puzzle } from "./types";

/** Nine bits, one per digit: bit 0 is a 1, bit 8 is a 9. */
export type Mask = number;

export const ALL_DIGITS: Mask = 0x1ff;

export const bit = (d: Digit): Mask => 1 << (d - 1);
export const hasDigit = (m: Mask, d: Digit): boolean => (m & bit(d)) !== 0;

export function digitsOf(m: Mask): Digit[] {
  const out: Digit[] = [];
  for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) out.push(d as Digit);
  return out;
}

export function countBits(m: Mask): number {
  let n = 0;
  let v = m;
  while (v !== 0) {
    v &= v - 1;
    n++;
  }
  return n;
}

/** The digit, when a mask holds exactly one. This is a naked single. */
export function soleDigit(m: Mask): Digit | null {
  return countBits(m) === 1 ? (digitsOf(m)[0] ?? null) : null;
}

/**
 * Givens overlaid with player entries. A given always wins: entries are only
 * ever written to empty cells, and letting a stray one shadow a given would
 * silently corrupt the puzzle rather than fail loudly.
 */
export function mergedGrid(board: Board): Grid {
  const out: Cell[] = new Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    out[i] = board.puzzle.givens[i] !== 0 ? board.puzzle.givens[i] : board.entries[i];
  }
  return out;
}

/**
 * The candidates for every cell, recomputed from scratch.
 *
 * There is deliberately no incremental cache. A cache is the obvious
 * optimisation and it is exactly the thing that would let the notes on screen
 * drift out of step with the board — and "the notes are always correct" is the
 * entire feature. Eighty-one cells of bitwise work is not a price worth that
 * risk.
 */
export function candidatesForGrid(grid: Grid): Mask[] {
  const out: Mask[] = new Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) {
      out[i] = 0;
      continue;
    }
    let m = ALL_DIGITS;
    for (const p of PEERS[i]) {
      const v = grid[p];
      if (v !== 0) m &= ~(1 << (v - 1));
    }
    out[i] = m;
  }
  return out;
}

export function allCandidates(board: Board): Mask[] {
  return candidatesForGrid(mergedGrid(board));
}

export function emptyBoard(puzzle: Puzzle): Board {
  return { puzzle, entries: new Array(CELLS).fill(0) as Cell[] };
}

export function valueAt(board: Board, i: Idx): Cell {
  return board.puzzle.givens[i] !== 0 ? board.puzzle.givens[i] : board.entries[i];
}
