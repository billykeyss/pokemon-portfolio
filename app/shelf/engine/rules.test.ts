import { describe, expect, it } from "vitest";
import {
  applyMove,
  canTake,
  canonicalKey,
  cloneShelf,
  frontOf,
  isSolved,
  isStuck,
  legalMoves,
  resolveTray,
  trayFree,
} from "./rules";
import type { Shelf } from "./types";

const shelf = (columns: number[][], tray: number[] = [], traySize = 7): Shelf => ({
  columns: columns.map((c) => [...c]),
  tray: [...tray],
  traySize,
  types: 3,
});

describe("frontOf", () => {
  it("returns the last item, which is the reachable one", () => {
    expect(frontOf([0, 1, 2])).toBe(2);
  });

  it("returns null for an empty column", () => {
    expect(frontOf([])).toBeNull();
  });
});

describe("resolveTray", () => {
  it("leaves an incomplete set alone", () => {
    expect(resolveTray([0, 0, 1])).toEqual([0, 0, 1]);
  });

  it("clears a complete set", () => {
    expect(resolveTray([0, 0, 0])).toEqual([]);
  });

  it("clears only three of four copies", () => {
    expect(resolveTray([0, 0, 0, 0])).toEqual([0]);
  });

  it("keeps unrelated items in place", () => {
    expect(resolveTray([1, 0, 0, 2, 0])).toEqual([1, 2]);
  });

  it("cascades when one clear reveals another", () => {
    // Six items, two complete sets: a single pass would leave the second.
    expect(resolveTray([0, 0, 0, 1, 1, 1])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const tray = [0, 0, 0];
    resolveTray(tray);
    expect(tray).toEqual([0, 0, 0]);
  });
});

describe("trayFree / canTake", () => {
  it("reports remaining slots", () => {
    expect(trayFree(shelf([[0]], [1, 2], 7))).toBe(5);
  });

  it("refuses to take from an empty column", () => {
    expect(canTake(shelf([[]]), 0)).toBe(false);
  });

  it("refuses when the tray is full", () => {
    expect(canTake(shelf([[0]], [1, 2, 3], 3), 0)).toBe(false);
  });

  it("refuses an out-of-range column", () => {
    expect(canTake(shelf([[0]]), 5)).toBe(false);
  });

  it("allows a normal take", () => {
    expect(canTake(shelf([[0, 1]]), 0)).toBe(true);
  });
});

describe("applyMove", () => {
  it("moves the front item onto the tray", () => {
    const after = applyMove(shelf([[0, 1]]), { column: 0 });
    expect(after.columns[0]).toEqual([0]);
    expect(after.tray).toEqual([1]);
  });

  it("clears a set as soon as it completes", () => {
    const after = applyMove(shelf([[2]], [2, 2]), { column: 0 });
    expect(after.tray).toEqual([]);
  });

  it("does not mutate its input", () => {
    const before = shelf([[0, 1]], [2]);
    const snapshot = JSON.stringify(before);
    applyMove(before, { column: 0 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("throws rather than corrupting state on an illegal take", () => {
    expect(() => applyMove(shelf([[]]), { column: 0 })).toThrow();
    expect(() => applyMove(shelf([[0]], [1, 2, 3], 3), { column: 0 })).toThrow();
  });
});

describe("isSolved", () => {
  it("needs both the shelves and the tray empty", () => {
    expect(isSolved(shelf([[], []], []))).toBe(true);
    expect(isSolved(shelf([[], []], [1]))).toBe(false);
    expect(isSolved(shelf([[0]], []))).toBe(false);
  });
});

describe("legalMoves", () => {
  it("offers one move per non-empty column", () => {
    expect(legalMoves(shelf([[0], [1], []]))).toEqual([{ column: 0 }, { column: 1 }]);
  });

  it("offers nothing once the tray is full", () => {
    expect(legalMoves(shelf([[0], [1]], [2, 3, 4], 3))).toEqual([]);
  });

  it("collapses columns whose entire contents match", () => {
    // Identical stacks are genuinely the same choice.
    expect(legalMoves(shelf([[0, 1], [0, 1]]))).toHaveLength(1);
  });

  it("keeps columns that show the same item but differ behind it", () => {
    // Same front, different futures — these are not the same move.
    expect(legalMoves(shelf([[0, 1], [2, 1]]))).toHaveLength(2);
  });
});

describe("isStuck", () => {
  it("is true when the tray is full and nothing can clear", () => {
    expect(isStuck(shelf([[0]], [1, 2, 3], 3))).toBe(true);
  });

  it("is false when the board is finished", () => {
    expect(isStuck(shelf([[]], []))).toBe(false);
  });

  it("is false while a move remains", () => {
    expect(isStuck(shelf([[0]], [1], 7))).toBe(false);
  });
});

describe("canonicalKey", () => {
  it("ignores which shelf a column sits on", () => {
    expect(canonicalKey(shelf([[0, 1], [2]]))).toBe(canonicalKey(shelf([[2], [0, 1]])));
  });

  it("ignores the order items landed on the tray", () => {
    expect(canonicalKey(shelf([[0]], [1, 2]))).toBe(canonicalKey(shelf([[0]], [2, 1])));
  });

  it("separates genuinely different positions", () => {
    expect(canonicalKey(shelf([[0, 1]]))).not.toBe(canonicalKey(shelf([[1, 0]])));
  });
});

describe("cloneShelf", () => {
  it("produces an independent copy", () => {
    const s = shelf([[0, 1]], [2]);
    const copy = cloneShelf(s);
    copy.columns[0].push(9);
    copy.tray.push(9);
    expect(s.columns[0]).toEqual([0, 1]);
    expect(s.tray).toEqual([2]);
  });
});
