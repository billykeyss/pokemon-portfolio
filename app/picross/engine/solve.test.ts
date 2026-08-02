import { describe, expect, it } from "vitest";
import { puzzleFrom } from "./clues";
import { isLineSolvable, solve } from "./solve";
import { FILLED, UNKNOWN, type Picture } from "./types";

const HEART: Picture = {
  id: "heart",
  name: "Heart",
  colour: "#C9457A",
  grid: [".#.#.", "#####", "#####", ".###.", "..#.."],
};

/**
 * The smallest picture that is uniquely solvable but NOT line-solvable: two
 * diagonal pairs. Both diagonals satisfy every row and column clue, so no line
 * ever forces a cell and the player can only guess.
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
});

describe("isLineSolvable", () => {
  it("separates the fair puzzle from the guessy one", () => {
    expect(isLineSolvable(puzzleFrom(HEART))).toBe(true);
    expect(isLineSolvable(puzzleFrom(AMBIGUOUS))).toBe(false);
  });
});
