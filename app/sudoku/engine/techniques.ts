import {
  candidatesForGrid,
  countBits,
  digitsOf,
  mergedGrid,
  soleDigit,
  type Mask,
} from "./candidates";
import { CELLS, PEERS, UNITS, cellsOf, colOf, rowOf } from "./grid";
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
      //
      // This scan only finds placed digits, so it is guaranteed non-empty
      // exactly when `s.cands` holds pure peer-eliminated candidates — the
      // state the hint path always builds fresh via initState(mergedGrid(...)).
      // The finders below this one narrow cands for reasons with no placed
      // digit behind them; run this on a state they have touched and `because`
      // can come back empty even though a hidden single is real. Nothing here
      // enforces that — it's on the caller.
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

/** The candidate removals a finder justifies: digit `d` was a candidate at `i`, now isn't. */
function elimsFor(s: SolveState, cells: readonly Idx[], skip: Set<Idx>, digits: Digit[]): Elim[] {
  const out: Elim[] = [];
  for (const i of cells) {
    if (skip.has(i) || s.grid[i] !== 0) continue;
    for (const d of digits) {
      if ((s.cands[i] & (1 << (d - 1))) !== 0) out.push({ cell: i, digit: d });
    }
  }
  return out;
}

function findLockedCandidates(s: SolveState): Deduction | null {
  for (const box of UNITS.filter((u) => u.kind === "box")) {
    const boxCells = cellsOf(box);
    for (let d = 1 as Digit; d <= 9; d = (d + 1) as Digit) {
      const homes = boxCells.filter(
        (i) => s.grid[i] === 0 && (s.cands[i] & (1 << (d - 1))) !== 0,
      );
      if (homes.length < 2) continue;

      for (const kind of ["row", "col"] as const) {
        const lineIndex = kind === "row" ? rowOf(homes[0]) : colOf(homes[0]);
        const sameLine = homes.every(
          (i) => (kind === "row" ? rowOf(i) : colOf(i)) === lineIndex,
        );
        if (!sameLine) continue;

        const line: Unit = { kind, index: lineIndex };
        const removes = elimsFor(s, cellsOf(line), new Set(boxCells), [d]);
        if (removes.length === 0) continue;

        return { kind: "locked-candidates", digit: d, box, line, cells: homes, removes };
      }
    }
  }
  return null;
}

/** Every `size`-length subset of `items`, order preserved within each subset. */
function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i <= items.length - size; i++) {
    for (const rest of combinations(items.slice(i + 1), size - 1)) {
      out.push([items[i], ...rest]);
    }
  }
  return out;
}

function findNakedSubset(s: SolveState): Deduction | null {
  for (const unit of UNITS) {
    // Empty is not the same as live. A cell can be unsolved yet hold zero
    // candidates — an entry wrong enough to be peer-eliminated everywhere but
    // still sitting on the board. Such a cell contributes nothing to the union
    // mask, so it would ride along in any group that already accounts for the
    // full subset and get named as a member of a pair it cannot actually
    // hold a digit for. Filtering it out here keeps the argument honest.
    const open = cellsOf(unit).filter((i) => s.grid[i] === 0 && s.cands[i] !== 0);
    for (const size of [2, 3]) {
      for (const group of combinations(open, size)) {
        let union = 0;
        for (const i of group) union |= s.cands[i];
        if (countBits(union) !== size) continue;

        const digits = digitsOf(union);
        const removes = elimsFor(s, cellsOf(unit), new Set(group), digits);
        if (removes.length === 0) continue;

        return { kind: "naked-subset", cells: group, digits, unit, removes };
      }
    }
  }
  return null;
}

function findHiddenSubset(s: SolveState): Deduction | null {
  for (const unit of UNITS) {
    const open = cellsOf(unit).filter((i) => s.grid[i] === 0);
    const live = digitsOf(
      open.reduce((m, i) => m | s.cands[i], 0),
    ).filter((d) => !cellsOf(unit).some((i) => s.grid[i] === d));

    for (const size of [2, 3]) {
      for (const digits of combinations(live, size)) {
        const homes = open.filter((i) =>
          digits.some((d) => (s.cands[i] & (1 << (d - 1))) !== 0),
        );
        if (homes.length !== size) continue;

        const others = digitsOf(
          homes.reduce((m, i) => m | s.cands[i], 0),
        ).filter((d) => !digits.includes(d));
        if (others.length === 0) continue;

        const removes = elimsFor(s, homes, new Set(), others);
        if (removes.length === 0) continue;

        return { kind: "hidden-subset", cells: homes, digits, unit, removes };
      }
    }
  }
  return null;
}

function findXWing(s: SolveState): Deduction | null {
  for (const [lineKind, coverKind] of [["row", "col"], ["col", "row"]] as const) {
    const lines = UNITS.filter((u) => u.kind === lineKind);

    for (let d = 1 as Digit; d <= 9; d = (d + 1) as Digit) {
      const pairs: { line: Unit; cells: Idx[]; covers: number[] }[] = [];
      for (const line of lines) {
        const homes = cellsOf(line).filter(
          (i) => s.grid[i] === 0 && (s.cands[i] & (1 << (d - 1))) !== 0,
        );
        if (homes.length !== 2) continue;
        const covers = homes.map((i) => (coverKind === "col" ? colOf(i) : rowOf(i)));
        pairs.push({ line, cells: homes, covers });
      }

      for (const [a, b] of combinations(pairs, 2)) {
        if (a.covers[0] !== b.covers[0] || a.covers[1] !== b.covers[1]) continue;

        const covers: Unit[] = a.covers.map((index) => ({ kind: coverKind, index }));
        const corner = new Set([...a.cells, ...b.cells]);
        const removes = covers.flatMap((u) => elimsFor(s, cellsOf(u), corner, [d]));
        if (removes.length === 0) continue;

        return {
          kind: "x-wing",
          digit: d,
          cells: [...corner],
          lines: [a.line, b.line],
          covers,
          removes,
        };
      }
    }
  }
  return null;
}

export function nextDeductionIn(s: SolveState): Deduction | null {
  return (
    findNakedSingle(s) ??
    findHiddenSingle(s) ??
    findLockedCandidates(s) ??
    findNakedSubset(s) ??
    findHiddenSubset(s) ??
    findXWing(s) ??
    null
  );
}

function unhandled(d: never): never {
  throw new Error(`applyToState: deduction neither places nor eliminates: ${JSON.stringify(d)}`);
}

export function applyToState(s: SolveState, d: Deduction): void {
  switch (d.kind) {
    case "naked-single":
    case "hidden-single":
      s.grid[d.cell] = d.digit;
      s.cands = candidatesForGrid(s.grid);
      return;

    case "locked-candidates":
    case "naked-subset":
    case "hidden-subset":
    case "x-wing":
      for (const e of d.removes) s.cands[e.cell] &= ~(1 << (e.digit - 1));
      return;

    // hardestRank's for(;;) has no iteration cap. It terminates only because
    // every deduction either places a digit (monotonic, capped at 81) or
    // clears a candidate bit (monotonic, capped at 729). A kind that did
    // neither would leave the state byte-identical and spin that loop forever,
    // hanging the tab mid-generation with no error to point at. The proof rested
    // on a convention nothing enforced; this enforces it — at compile time for
    // a variant added to the union, and loudly at runtime for one that slips
    // past the type system.
    default:
      return unhandled(d);
  }
}

/** The next deduction from what the player can currently see. */
export function nextDeduction(board: Board): Deduction | null {
  return nextDeductionIn(initState(mergedGrid(board)));
}
