import { describe, expect, it } from "vitest";
import { levelCount, puzzleForLevel } from "./level";
import { PICTURES } from "./pictures";

describe("levelCount", () => {
  it("is exactly the size of the picture library", () => {
    // Unlike every other cabinet this game is finite: each level is a specific
    // drawing, so there is no seed to generate a level 500 from.
    expect(levelCount()).toBe(PICTURES.length);
  });
});

describe("puzzleForLevel", () => {
  it("returns the same puzzle every call", () => {
    expect(puzzleForLevel(2).id).toBe(puzzleForLevel(2).id);
  });

  it("never shrinks as the level climbs", () => {
    let size = 0;
    for (let n = 1; n <= levelCount(); n++) {
      const puzzle = puzzleForLevel(n);
      expect(puzzle.size).toBeGreaterThanOrEqual(size);
      size = puzzle.size;
    }
  });

  it("clamps out-of-range levels instead of throwing", () => {
    expect(puzzleForLevel(0).id).toBe(puzzleForLevel(1).id);
    expect(puzzleForLevel(-5).id).toBe(puzzleForLevel(1).id);
    expect(puzzleForLevel(9999).id).toBe(puzzleForLevel(levelCount()).id);
  });
});
