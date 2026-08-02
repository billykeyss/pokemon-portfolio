import { describe, expect, it } from "vitest";
import { ALL_DIGITS } from "./candidates";
import {
  initState,
  nextDeductionIn,
  placementOf,
  techniqueRank,
  type SolveState,
} from "./techniques";
import type { Cell, Grid } from "./types";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

/**
 * Build a state directly, so one technique can be provoked in isolation.
 *
 * Real grids are a poor way to test a single finder: whichever technique ranks
 * first fires, so a fixture aimed at hidden pairs usually ends up asserting
 * something about singles instead. Setting candidates by hand removes that.
 */
const stateWith = (
  clear: { cells: number[]; digits: number[] }[] = [],
  only: Record<number, number[]> = {},
): SolveState => {
  const cands = new Array(81).fill(ALL_DIGITS) as number[];
  for (const { cells, digits } of clear) {
    for (const i of cells) for (const d of digits) cands[i] &= ~(1 << (d - 1));
  }
  for (const [i, digits] of Object.entries(only)) {
    cands[Number(i)] = digits.reduce((m, d) => m | (1 << (d - 1)), 0);
  }
  return { grid: new Array(81).fill(0) as Cell[], cands };
};

describe("naked single", () => {
  it("finds the only digit a cell can take", () => {
    // Row 0 holds 1..8, so r0c8 must be 9.
    const grid = parse("12345678." + ".".repeat(72));
    const d = nextDeductionIn(initState(grid));
    expect(d).toMatchObject({ kind: "naked-single", cell: 8, digit: 9 });
    expect(placementOf(d!)).toEqual({ cell: 8, digit: 9 });
  });
});

describe("hidden single", () => {
  it("finds a digit with only one home in its unit", () => {
    // In box 0, 7 is possible only in r3c3 (index 20). Every other cell in the
    // box has had 7 cleared, and no other unit is down to a single home.
    const state = stateWith([
      { cells: [0, 1, 2, 9, 10, 11, 18, 19], digits: [7] },
    ]);
    const d = nextDeductionIn(state);
    expect(d?.kind).toBe("hidden-single");
    if (d?.kind === "hidden-single") {
      expect(d.cell).toBe(20);
      expect(d.digit).toBe(7);
      expect(d.unit).toEqual({ kind: "box", index: 0 });
    }
  });

  it("names only cells that actually hold the digit in its argument", () => {
    // `because` is the reasoning the hint lights up, so it has to point at real
    // placed digits — which a synthetic candidate state cannot supply.
    //
    // Four 7s, placed so column 2 has exactly one cell left that can take one:
    // rows 0 and 1 are blocked by the 7s at r1c5 and r2c6, and r4c1/r7c2 knock
    // out the rest of the column through their boxes.
    //
    // Deliberately NOT the classic Wikipedia puzzle. Measured: with peer
    // candidates computed for every cell, that board solves in 51 naked singles
    // and produces no hidden single at all — because naked singles rank first
    // and auto-candidates make them free. A walk over it would assert nothing,
    // which is the same vacuous-pass trap this suite has hit twice already.
    const grid = new Array(81).fill(0) as Cell[];
    for (const i of [4, 14, 45, 55]) grid[i] = 7;

    const d = nextDeductionIn(initState(grid));
    expect(d?.kind).toBe("hidden-single");
    if (d?.kind === "hidden-single") {
      expect(d.cell).toBe(20);
      expect(d.digit).toBe(7);
      expect(d.unit).toEqual({ kind: "col", index: 2 });
      expect(d.because).toEqual([4, 14, 45, 55]);
      for (const i of d.because) expect(grid[i]).toBe(7);
    }
  });

  it("prefers a naked single, which is cheaper to see", () => {
    expect(techniqueRank("naked-single")).toBeLessThan(techniqueRank("hidden-single"));
  });
});

describe("nextDeductionIn", () => {
  it("returns null on a solved grid", () => {
    const solved = parse(
      "534678912" + "672195348" + "198342567" +
      "859761423" + "426853791" + "713924856" +
      "961537284" + "287419635" + "345286179",
    );
    expect(nextDeductionIn(initState(solved))).toBeNull();
  });

  it("returns null when nothing it knows applies", () => {
    expect(nextDeductionIn(initState(parse(".".repeat(81))))).toBeNull();
  });
});
