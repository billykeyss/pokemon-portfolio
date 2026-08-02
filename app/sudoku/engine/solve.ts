import { ALL_DIGITS, candidatesForGrid, countBits, digitsOf } from "./candidates";
import { CELLS, UNITS, cellsOf } from "./grid";
import type { Cell, Digit, Grid } from "./types";

/**
 * Backtracking search, always branching on the most constrained empty cell.
 *
 * Picking the cell with fewest candidates rather than the first empty one is
 * what makes this fast enough to run inside the generator's inner loop, where
 * it is called once per clue removal.
 */
function search(grid: Cell[], cap: number, found: Grid[]): void {
  if (found.length >= cap) return;

  const cands = candidatesForGrid(grid);

  let best = -1;
  let bestCount = 10;
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) continue;
    const n = countBits(cands[i]);
    if (n === 0) return; // dead end
    if (n < bestCount) {
      best = i;
      bestCount = n;
      if (n === 1) break;
    }
  }

  if (best === -1) {
    found.push([...grid]);
    return;
  }

  for (const d of digitsOf(cands[best])) {
    grid[best] = d;
    search(grid, cap, found);
    grid[best] = 0;
    if (found.length >= cap) return;
  }
}

/** The first solution, or null if there is none. */
export function solveGrid(grid: Grid): Grid | null {
  const found: Grid[] = [];
  search([...grid] as Cell[], 1, found);
  return found[0] ?? null;
}

/**
 * How many solutions a grid has, giving up once `cap` are found.
 *
 * The cap is the whole point: an empty grid has more solutions than atoms in a
 * room, and the only question the generator ever asks is "is this still
 * exactly one?".
 */
export function countSolutions(grid: Grid, cap = 2): number {
  const found: Grid[] = [];
  search([...grid] as Cell[], cap, found);
  return found.length;
}

/** A complete grid with no repeat in any unit. */
export function isValidGrid(grid: Grid): boolean {
  if (grid.length !== CELLS) return false;
  if (grid.some((c) => c === 0)) return false;

  for (const unit of UNITS) {
    let seen = 0;
    for (const i of cellsOf(unit)) {
      const b = 1 << ((grid[i] as Digit) - 1);
      if (seen & b) return false;
      seen |= b;
    }
    if (seen !== ALL_DIGITS) return false;
  }
  return true;
}
