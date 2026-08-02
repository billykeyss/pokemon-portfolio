import { describe, expect, it } from "vitest";
import { runsOf, puzzleFrom } from "./clues";
import { BLANK, FILLED, type Picture } from "./types";

const line = (...v: number[]) => Uint8Array.from(v);

const HEART: Picture = {
  id: "heart",
  name: "Heart",
  colour: "#C9457A",
  grid: [".#.#.", "#####", "#####", ".###.", "..#.."],
};

describe("runsOf", () => {
  it("reads consecutive filled runs in order", () => {
    expect(runsOf(line(FILLED, FILLED, BLANK, FILLED))).toEqual([2, 1]);
  });

  it("gives an empty line no runs at all", () => {
    // Rendered as "0", but internally the absence of runs — a clue list of
    // [0] would wrongly claim a run exists.
    expect(runsOf(line(BLANK, BLANK, BLANK))).toEqual([]);
  });

  it("closes a run that reaches the end", () => {
    expect(runsOf(line(BLANK, FILLED, FILLED))).toEqual([2]);
  });
});

describe("puzzleFrom", () => {
  it("derives row and column clues from the picture", () => {
    const p = puzzleFrom(HEART);
    expect(p.size).toBe(5);
    expect(p.rowClues).toEqual([[1, 1], [5], [5], [3], [1]]);
    expect(p.colClues).toEqual([[2], [4], [4], [4], [2]]);
  });

  it("marks exactly the # cells as filled", () => {
    const p = puzzleFrom(HEART);
    expect(p.solution[0]).toBe(BLANK);
    expect(p.solution[1]).toBe(FILLED);
    expect(p.solution.filter((c) => c === FILLED)).toHaveLength(16);
  });

  it("rejects a non-square picture rather than shipping a broken board", () => {
    expect(() => puzzleFrom({ ...HEART, grid: ["##", "#"] })).toThrow();
  });
});
