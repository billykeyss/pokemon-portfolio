import { describe, expect, it } from "vitest";
import { puzzleFrom } from "./clues";
import { isLineSolvable, maxPassesFor, solve } from "./solve";
import { UNKNOWN, type Picture } from "./types";

const HEART: Picture = {
  id: "heart",
  name: "Heart",
  colour: "#C9457A",
  grid: [".#.#.", "#####", "#####", ".###.", "..#.."],
};

/**
 * Two solutions, so no line ever forces anything.
 *
 * Both diagonals satisfy every row and column clue, and the solver stalls with
 * the whole board still unknown.
 *
 * This is ambiguity, which is not the subtler case the fairness bar also
 * excludes: a puzzle with exactly one solution that still cannot be reached
 * line by line. `isLineSolvable` rejects both, which is precisely why it is the
 * bar rather than uniqueness.
 */
const AMBIGUOUS: Picture = {
  id: "ambiguous",
  name: "Ambiguous",
  colour: "#000000",
  grid: ["#.", ".#"],
};

describe("solve", () => {
  it("solves a line-solvable puzzle completely", () => {
    const result = solve(puzzleFrom(HEART));
    expect(result.status).toBe("solved");
    expect([...result.board]).toEqual([...puzzleFrom(HEART).solution]);
  });

  it("stalls rather than guessing when no line forces anything", () => {
    const result = solve(puzzleFrom(AMBIGUOUS));
    expect(result.status).toBe("stalled");
    expect([...result.board].some((c) => c === UNKNOWN)).toBe(true);
  });

  it("never writes a cell that disagrees with the solution", () => {
    const puzzle = puzzleFrom(HEART);
    const result = solve(puzzle);
    for (let i = 0; i < result.board.length; i++) {
      if (result.board[i] !== UNKNOWN) {
        expect(result.board[i]).toBe(puzzle.solution[i]);
      }
    }
  });

  it("terminates", () => {
    expect(solve(puzzleFrom(HEART)).passes).toBeLessThan(100);
  });

  it("does not stall purely due to pass limit on larger puzzles", () => {
    // Construct a 15x15 all-filled puzzle: trivially solvable in 1 pass,
    // demonstrates the pass cap scales with board size.
    const grid15 = Array(15).fill("#".repeat(15));
    const puzzle15: Picture = {
      id: "filled15",
      name: "Filled 15x15",
      colour: "#000000",
      grid: grid15,
    };
    const result = solve(puzzleFrom(puzzle15));
    // All filled means every cell is immediately forced, solves in 1 pass.
    expect(result.status).toBe("solved");
    // Passes should be well under the 226 passes that size*size+1 would allow.
    expect(result.passes).toBeLessThan(5);
  });
});

describe("isLineSolvable", () => {
  it("separates the fair puzzle from the guessy one", () => {
    expect(isLineSolvable(puzzleFrom(HEART))).toBe(true);
    expect(isLineSolvable(puzzleFrom(AMBIGUOUS))).toBe(false);
  });
});

describe("maxPassesFor", () => {
  it("always allows at least one pass per cell", () => {
    // Every pass that continues determines at least one cell, so a cap below
    // the cell count can truncate a puzzle mid-progress and report it stalled.
    // A fixed 200 broke exactly this way at 15x15, which has 225 cells.
    for (const size of [5, 8, 10, 12, 15]) {
      expect(maxPassesFor(size)).toBeGreaterThan(size * size);
    }
  });
});
