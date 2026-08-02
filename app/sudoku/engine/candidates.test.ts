import { describe, expect, it } from "vitest";
import {
  ALL_DIGITS,
  allCandidates,
  candidatesForGrid,
  countBits,
  digitsOf,
  hasDigit,
  mergedGrid,
  soleDigit,
} from "./candidates";
import { CELLS, PEERS } from "./grid";
import type { Cell, Digit, Grid, Puzzle } from "./types";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

const EMPTY = parse(".".repeat(81));

describe("masks", () => {
  it("round-trips digits", () => {
    expect(digitsOf(ALL_DIGITS)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(digitsOf(0)).toEqual([]);
  });

  it("counts bits", () => {
    expect(countBits(ALL_DIGITS)).toBe(9);
    expect(countBits(0)).toBe(0);
  });

  it("reports a sole digit only when there is exactly one", () => {
    expect(soleDigit(0)).toBeNull();
    expect(soleDigit(ALL_DIGITS)).toBeNull();

    const mask = (digits: Digit[]) => digits.reduce((m, d) => m | (1 << (d - 1)), 0);
    expect(soleDigit(mask([4]))).toBe(4);
    expect(soleDigit(mask([1, 2]))).toBeNull();
    expect(soleDigit(mask([1, 2, 4]))).toBeNull();

    for (let d = 1; d <= 9; d++) {
      expect(soleDigit(mask([d as Digit]))).toBe(d);
    }
  });

  it("tests membership", () => {
    expect(hasDigit(ALL_DIGITS, 5)).toBe(true);
    expect(hasDigit(0, 5)).toBe(false);
  });
});

describe("candidatesForGrid", () => {
  it("offers every digit everywhere on an empty grid", () => {
    const c = candidatesForGrid(EMPTY);
    expect(c).toHaveLength(CELLS);
    for (const m of c) expect(m).toBe(ALL_DIGITS);
  });

  it("offers nothing in a filled cell", () => {
    const grid = parse("5" + ".".repeat(80));
    expect(candidatesForGrid(grid)[0]).toBe(0);
  });

  it("never offers a digit a peer already holds", () => {
    const grid = parse(
      "53..7...." + "6..195..." + ".98....6." +
      "8...6...3" + "4..8.3..1" + "7...2...6" +
      ".6....28." + "...419..5" + "....8..79",
    );
    const cands = candidatesForGrid(grid);
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] !== 0) continue;
      for (const d of digitsOf(cands[i])) {
        for (const p of PEERS[i]) expect(grid[p]).not.toBe(d);
      }
    }
  });

  it("leaves nothing on a solved grid", () => {
    const solved = parse(
      "534678912" + "672195348" + "198342567" +
      "859761423" + "426853791" + "713924856" +
      "961537284" + "287419635" + "345286179",
    );
    expect(candidatesForGrid(solved).every((m) => m === 0)).toBe(true);
  });
});

describe("mergedGrid / allCandidates", () => {
  const puzzle: Puzzle = {
    givens: parse("5" + ".".repeat(80)),
    solution: EMPTY,
    tier: "easy",
    seed: 1,
  };

  it("overlays entries onto givens", () => {
    const entries = [...EMPTY] as Cell[];
    entries[1] = 3;
    const merged = mergedGrid({ puzzle, entries });
    expect(merged[0]).toBe(5);
    expect(merged[1]).toBe(3);
  });

  it("lets a given win over a stray entry, since givens are immutable", () => {
    const entries = [...EMPTY] as Cell[];
    entries[0] = 9;
    expect(mergedGrid({ puzzle, entries })[0]).toBe(5);
  });

  it("computes candidates over the merged view", () => {
    const entries = [...EMPTY] as Cell[];
    entries[1] = 3;
    const cands = allCandidates({ puzzle, entries });
    expect(hasDigit(cands[2], 5)).toBe(false);
    expect(hasDigit(cands[2], 3)).toBe(false);
    expect(hasDigit(cands[2], 4)).toBe(true);
  });
});
