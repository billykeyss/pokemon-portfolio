import { describe, expect, it } from "vitest";
import {
  applyMove,
  canPour,
  clonePuzzle,
  isComplete,
  isSolved,
  legalMoves,
  pourCount,
  topRun,
} from "./rules";
import type { Puzzle } from "./types";

const puzzle = (bottles: number[][], colors = 2, capacity = 4): Puzzle => ({
  bottles: bottles.map((b) => [...b]),
  capacity,
  colors,
});

describe("topRun", () => {
  it("returns null for an empty bottle", () => {
    expect(topRun([])).toBeNull();
  });

  it("counts only the contiguous run at the top", () => {
    expect(topRun([0, 1, 1])).toEqual({ color: 1, count: 2 });
  });

  it("counts a full monochrome bottle as one run", () => {
    expect(topRun([3, 3, 3, 3])).toEqual({ color: 3, count: 4 });
  });
});

describe("canPour", () => {
  it("rejects pouring from an empty bottle", () => {
    expect(canPour(puzzle([[], [0]]), 0, 1)).toBe(false);
  });

  it("rejects pouring into itself", () => {
    expect(canPour(puzzle([[0]]), 0, 0)).toBe(false);
  });

  it("rejects pouring into a full bottle", () => {
    expect(canPour(puzzle([[0], [0, 0, 0, 0]]), 0, 1)).toBe(false);
  });

  it("rejects a colour mismatch", () => {
    expect(canPour(puzzle([[0], [1]]), 0, 1)).toBe(false);
  });

  it("allows pouring onto a matching top", () => {
    expect(canPour(puzzle([[0], [0]]), 0, 1)).toBe(true);
  });

  it("allows pouring into an empty bottle", () => {
    expect(canPour(puzzle([[0], []]), 0, 1)).toBe(true);
  });
});

describe("pourCount", () => {
  it("moves the whole top run when there is room", () => {
    expect(pourCount(puzzle([[1, 0, 0], []]), 0, 1)).toBe(2);
  });

  it("clamps to the destination's free space", () => {
    expect(
      pourCount(
        puzzle([
          [0, 0, 0],
          [0, 0, 0],
        ]),
        0,
        1,
      ),
    ).toBe(1);
  });

  it("is zero for an illegal move", () => {
    expect(pourCount(puzzle([[0], [1]]), 0, 1)).toBe(0);
  });
});

describe("applyMove", () => {
  it("transfers the clamped run", () => {
    const before = puzzle([[1, 0, 0], [0]]);
    const after = applyMove(before, { from: 0, to: 1 });
    expect(after.bottles).toEqual([[1], [0, 0, 0]]);
  });

  it("does not mutate its input", () => {
    const before = puzzle([[1, 0, 0], [0]]);
    const snapshot = JSON.stringify(before);
    applyMove(before, { from: 0, to: 1 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("conserves total units", () => {
    const before = puzzle([[1, 0, 0], [0], []]);
    const after = applyMove(before, { from: 0, to: 2 });
    const count = (p: Puzzle) => p.bottles.reduce((n, b) => n + b.length, 0);
    expect(count(after)).toBe(count(before));
  });

  it("throws on an illegal move rather than corrupting state", () => {
    expect(() => applyMove(puzzle([[0], [1]]), { from: 0, to: 1 })).toThrow();
  });
});

describe("isComplete", () => {
  it("is true for a full monochrome bottle", () => {
    expect(isComplete([2, 2, 2, 2], 4)).toBe(true);
  });

  it("is false when not full", () => {
    expect(isComplete([2, 2, 2], 4)).toBe(false);
  });

  it("is false when mixed", () => {
    expect(isComplete([2, 2, 2, 1], 4)).toBe(false);
  });

  it("is false for empty", () => {
    expect(isComplete([], 4)).toBe(false);
  });
});

describe("isSolved", () => {
  it("accepts every colour gathered and full", () => {
    expect(
      isSolved(
        puzzle([
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [],
        ]),
      ),
    ).toBe(true);
  });

  it("rejects a partially filled monochrome bottle", () => {
    expect(
      isSolved(
        puzzle([
          [0, 0, 0],
          [1, 1, 1, 1],
          [0],
        ]),
      ),
    ).toBe(false);
  });

  it("rejects a mixed bottle", () => {
    expect(
      isSolved(
        puzzle([
          [0, 1, 0, 1],
          [1, 0, 1, 0],
          [],
        ]),
      ),
    ).toBe(false);
  });
});

describe("legalMoves", () => {
  it("never pours out of a completed bottle", () => {
    const moves = legalMoves(puzzle([[0, 0, 0, 0], []]));
    expect(moves.every((m) => m.from !== 0)).toBe(true);
  });

  it("offers only one destination when several bottles are empty", () => {
    const moves = legalMoves(puzzle([[0, 1], [], [], []]));
    const fromZero = moves.filter((m) => m.from === 0);
    expect(fromZero).toHaveLength(1);
  });

  it("never moves a monochrome bottle into an empty bottle", () => {
    const moves = legalMoves(puzzle([[0, 0], []]));
    expect(moves).toHaveLength(0);
  });

  it("offers both directions when two bottles share a top colour", () => {
    // Both pours are genuinely legal here: 0 -> 1 consolidates onto the single
    // unit, and 1 -> 0 stacks onto bottle zero's matching top.
    expect(legalMoves(puzzle([[1, 0], [0]]))).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 0 },
    ]);
  });

  it("excludes a destination whose top colour differs", () => {
    expect(legalMoves(puzzle([[0], [1]]))).toEqual([]);
  });
});

describe("clonePuzzle", () => {
  it("produces an independent copy", () => {
    const p = puzzle([[0, 1], []]);
    const c = clonePuzzle(p);
    c.bottles[0].push(2);
    expect(p.bottles[0]).toEqual([0, 1]);
  });
});
