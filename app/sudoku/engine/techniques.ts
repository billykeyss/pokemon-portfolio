import {
  candidatesForGrid,
  countBits,
  mergedGrid,
  soleDigit,
  type Mask,
} from "./candidates";
import { CELLS, PEERS, UNITS, cellsOf } from "./grid";
import type { Board, Cell, Digit, Grid, Idx, Unit } from "./types";

/** One candidate removal a technique justifies. */
export interface Elim {
  cell: Idx;
  digit: Digit;
}

export type DeductionKind =
  | "naked-single"
  | "hidden-single"
  | "locked-candidates"
  | "naked-subset"
  | "hidden-subset"
  | "x-wing";

/**
 * A deduction is the *argument*, not the move.
 *
 * Every variant carries the cells, units and digits its reasoning rests on, so
 * one value drives both the sentence the hint panel prints and the highlight
 * the board draws. They cannot disagree, because they are the same value.
 */
export type Deduction =
  | { kind: "naked-single"; cell: Idx; digit: Digit }
  | { kind: "hidden-single"; cell: Idx; digit: Digit; unit: Unit; because: Idx[] }
  | { kind: "locked-candidates"; digit: Digit; box: Unit; line: Unit; cells: Idx[]; removes: Elim[] }
  | { kind: "naked-subset"; cells: Idx[]; digits: Digit[]; unit: Unit; removes: Elim[] }
  | { kind: "hidden-subset"; cells: Idx[]; digits: Digit[]; unit: Unit; removes: Elim[] }
  | { kind: "x-wing"; digit: Digit; cells: Idx[]; lines: Unit[]; covers: Unit[]; removes: Elim[] };

const RANK: Record<DeductionKind, number> = {
  "naked-single": 0,
  "hidden-single": 1,
  "locked-candidates": 2,
  "naked-subset": 3,
  "hidden-subset": 3,
  "x-wing": 4,
};

export function techniqueRank(kind: DeductionKind): number {
  return RANK[kind];
}

/** The placement a deduction makes, or null when it only eliminates. */
export function placementOf(d: Deduction): { cell: Idx; digit: Digit } | null {
  if (d.kind === "naked-single" || d.kind === "hidden-single") {
    return { cell: d.cell, digit: d.digit };
  }
  return null;
}

/**
 * A grid plus the candidates a chain of deductions has narrowed it to.
 *
 * The player's board only ever shows peer-eliminated candidates. Techniques
 * beyond singles remove candidates that peer logic cannot see, and those
 * removals live here rather than on the board — propagating them to the screen
 * would hand the player the Easy and Medium tiers outright.
 */
export interface SolveState {
  grid: Cell[];
  cands: Mask[];
}

export function initState(grid: Grid): SolveState {
  return { grid: [...grid] as Cell[], cands: candidatesForGrid(grid) };
}

function findNakedSingle(s: SolveState): Deduction | null {
  for (let i = 0; i < CELLS; i++) {
    if (s.grid[i] !== 0) continue;
    const digit = soleDigit(s.cands[i]);
    if (digit !== null) return { kind: "naked-single", cell: i, digit };
  }
  return null;
}

function findHiddenSingle(s: SolveState): Deduction | null {
  for (const unit of UNITS) {
    const cells = cellsOf(unit);
    for (let d = 1 as Digit; d <= 9; d = (d + 1) as Digit) {
      if (cells.some((i) => s.grid[i] === d)) continue;

      const homes = cells.filter((i) => s.grid[i] === 0 && (s.cands[i] & (1 << (d - 1))) !== 0);
      if (homes.length !== 1) continue;

      const cell = homes[0];
      // A cell with one candidate is a naked single; reporting it as hidden
      // would dress up the easier observation as the harder one.
      if (countBits(s.cands[cell]) === 1) continue;

      // The argument: every placed d that rules out one of this unit's other
      // empty cells. Those are the cells the hint lights up.
      const because: Idx[] = [];
      for (let i = 0; i < CELLS; i++) {
        if (s.grid[i] !== d) continue;
        if (cells.some((c) => c !== cell && s.grid[c] === 0 && sees(i, c))) because.push(i);
      }

      return { kind: "hidden-single", cell, digit: d, unit, because };
    }
  }
  return null;
}

function sees(a: Idx, b: Idx): boolean {
  return PEERS[a].includes(b);
}

export function nextDeductionIn(s: SolveState): Deduction | null {
  return findNakedSingle(s) ?? findHiddenSingle(s) ?? null;
}

export function applyToState(s: SolveState, d: Deduction): void {
  const place = placementOf(d);
  if (place !== null) {
    s.grid[place.cell] = place.digit;
    s.cands = candidatesForGrid(s.grid);
    return;
  }
  if ("removes" in d) {
    for (const e of d.removes) s.cands[e.cell] &= ~(1 << (e.digit - 1));
  }
}

/** The next deduction from what the player can currently see. */
export function nextDeduction(board: Board): Deduction | null {
  return nextDeductionIn(initState(mergedGrid(board)));
}
