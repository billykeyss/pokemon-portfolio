import { describe, expect, it } from "vitest";
import { countSolutions, isValidGrid, solveGrid } from "./solve";
import type { Cell, Grid } from "./types";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

const CLASSIC = parse(
  "53..7...." + "6..195..." + ".98....6." +
  "8...6...3" + "4..8.3..1" + "7...2...6" +
  ".6....28." + "...419..5" + "....8..79",
);

const SOLVED = parse(
  "534678912" + "672195348" + "198342567" +
  "859761423" + "426853791" + "713924856" +
  "961537284" + "287419635" + "345286179",
);

describe("solveGrid", () => {
  it("solves a classic puzzle", () => {
    expect(solveGrid(CLASSIC)).toEqual(SOLVED);
  });

  it("returns an already-solved grid unchanged", () => {
    expect(solveGrid(SOLVED)).toEqual(SOLVED);
  });

  it("returns null for a contradictory grid", () => {
    const bad = [...CLASSIC] as Cell[];
    bad[1] = 5; // a second 5 in row 0
    expect(solveGrid(bad)).toBeNull();
  });

  it("fills an empty grid with something valid", () => {
    const solved = solveGrid(parse(".".repeat(81)));
    expect(solved).not.toBeNull();
    expect(isValidGrid(solved as Grid)).toBe(true);
  });
});

describe("countSolutions", () => {
  it("finds exactly one for a proper puzzle", () => {
    expect(countSolutions(CLASSIC)).toBe(1);
  });

  it("finds none for a contradictory grid", () => {
    const bad = [...CLASSIC] as Cell[];
    bad[1] = 5;
    expect(countSolutions(bad)).toBe(0);
  });

  it("stops at the cap rather than enumerating everything", () => {
    // An empty grid has 6.6e21 solutions. Returning promptly is the point.
    expect(countSolutions(parse(".".repeat(81)), 2)).toBe(2);
  });

  it("detects a second solution when a clue is removed", () => {
    // Strip enough of the classic puzzle that uniqueness must fail.
    const loose = [...CLASSIC] as Cell[];
    for (let i = 0; i < 81; i += 2) loose[i] = 0;
    expect(countSolutions(loose, 2)).toBe(2);
  });
});

describe("isValidGrid", () => {
  it("accepts a solved grid", () => {
    expect(isValidGrid(SOLVED)).toBe(true);
  });

  it("rejects a duplicate in a unit", () => {
    const bad = [...SOLVED] as Cell[];
    bad[1] = bad[0];
    expect(isValidGrid(bad)).toBe(false);
  });

  it("rejects an incomplete grid", () => {
    expect(isValidGrid(CLASSIC)).toBe(false);
  });
});
