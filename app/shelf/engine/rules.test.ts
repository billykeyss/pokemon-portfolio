import { describe, expect, it } from "vitest";
import {
  applyMove,
  canMove,
  canonicalKey,
  cloneBoard,
  freeSlotIndex,
  frontOf,
  frontsOf,
  isSolved,
  isStuck,
  legalMoves,
  remaining,
  resolveMatches,
  shelfMatches,
} from "./rules";
import type { Board } from "./types";

/** Build a board from shelves of slots; each slot is back-to-front. */
const board = (shelves: number[][][], types = 3): Board => ({
  shelves: shelves.map((shelf) => shelf.map((slot) => [...slot])),
  types,
});

describe("frontOf", () => {
  it("returns the last item, which is the reachable one", () => {
    expect(frontOf([5, 2, 9])).toBe(9);
  });

  it("returns null for an empty slot", () => {
    expect(frontOf([])).toBeNull();
  });
});

describe("freeSlotIndex", () => {
  it("finds the first empty slot", () => {
    expect(freeSlotIndex(board([[[1], [], []]]), 0)).toBe(1);
  });

  it("is -1 when the shelf is full", () => {
    expect(freeSlotIndex(board([[[1], [2], [3]]]), 0)).toBe(-1);
  });

  it("is -1 for a shelf that does not exist", () => {
    expect(freeSlotIndex(board([[[1], [], []]]), 7)).toBe(-1);
  });
});

describe("shelfMatches", () => {
  it("is true when all three fronts agree", () => {
    expect(shelfMatches(board([[[4], [4], [4]]]), 0)).toBe(true);
  });

  it("ignores what is buried behind the fronts", () => {
    expect(shelfMatches(board([[[1, 4], [2, 4], [3, 4]]]), 0)).toBe(true);
  });

  it("is false when one front differs", () => {
    expect(shelfMatches(board([[[4], [4], [5]]]), 0)).toBe(false);
  });

  it("is false when a slot is empty", () => {
    expect(shelfMatches(board([[[4], [4], []]]), 0)).toBe(false);
  });
});

describe("frontsOf", () => {
  it("reports nulls for empty slots", () => {
    expect(frontsOf(board([[[1], [], [3]]]), 0)).toEqual([1, null, 3]);
  });
});

describe("resolveMatches", () => {
  it("clears a matching shelf", () => {
    const b = board([[[7], [7], [7]]]);
    expect(resolveMatches(b)).toBe(1);
    expect(isSolved(b)).toBe(true);
  });

  it("leaves a non-matching shelf alone", () => {
    const b = board([[[1], [2], [3]]]);
    expect(resolveMatches(b)).toBe(0);
  });

  it("cascades when clearing one match uncovers another", () => {
    // Behind three 7s sit three 8s: a single pass would leave the 8s showing.
    const b = board([[[8, 7], [8, 7], [8, 7]]]);
    expect(resolveMatches(b)).toBe(2);
    expect(isSolved(b)).toBe(true);
  });

  it("clears across several shelves", () => {
    const b = board([
      [[1], [1], [1]],
      [[2], [2], [2]],
    ]);
    expect(resolveMatches(b)).toBe(2);
  });
});

describe("canMove", () => {
  it("refuses to move onto the same shelf", () => {
    const b = board([[[1], [], []]]);
    expect(canMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 0 })).toBe(false);
  });

  it("refuses to move from an empty slot", () => {
    const b = board([
      [[], [], []],
      [[], [], []],
    ]);
    expect(canMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1 })).toBe(false);
  });

  it("refuses to move onto a full shelf", () => {
    const b = board([
      [[1], [], []],
      [[2], [3], [4]],
    ]);
    expect(canMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1 })).toBe(false);
  });

  it("allows a move to a shelf with room", () => {
    const b = board([
      [[1], [], []],
      [[2], [], []],
    ]);
    expect(canMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1 })).toBe(true);
  });
});

describe("applyMove", () => {
  it("moves the front item to the destination shelf", () => {
    const after = applyMove(
      board([
        [[1, 5], [], []],
        [[2], [], []],
      ]),
      { fromShelf: 0, fromSlot: 0, toShelf: 1 },
    );
    expect(after.shelves[0][0]).toEqual([1]);
    expect(after.shelves[1][1]).toEqual([5]);
  });

  it("uncovers what was buried behind it", () => {
    const after = applyMove(
      board([
        [[9, 5], [], []],
        [[2], [], []],
      ]),
      { fromShelf: 0, fromSlot: 0, toShelf: 1 },
    );
    expect(frontOf(after.shelves[0][0])).toBe(9);
  });

  it("clears the destination shelf when the move completes a match", () => {
    const after = applyMove(
      board([
        [[6], [], []],
        [[6], [6], []],
      ]),
      { fromShelf: 0, fromSlot: 0, toShelf: 1 },
    );
    expect(isSolved(after)).toBe(true);
  });

  it("does not mutate its input", () => {
    const before = board([
      [[1, 5], [], []],
      [[2], [], []],
    ]);
    const snapshot = JSON.stringify(before);
    applyMove(before, { fromShelf: 0, fromSlot: 0, toShelf: 1 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("throws rather than corrupting state on an illegal move", () => {
    const b = board([
      [[1], [], []],
      [[2], [3], [4]],
    ]);
    expect(() => applyMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1 })).toThrow();
  });
});

describe("legalMoves", () => {
  it("offers nothing when every shelf is full", () => {
    const b = board([
      [[1], [2], [3]],
      [[4], [5], [6]],
    ]);
    expect(legalMoves(b)).toEqual([]);
  });

  it("never targets the shelf an item is already on", () => {
    const b = board([
      [[1], [], []],
      [[2], [], []],
    ]);
    expect(legalMoves(b).every((m) => m.fromShelf !== m.toShelf)).toBe(true);
  });

  it("collapses identical stacks on one shelf into a single choice", () => {
    // Two slots holding the same thing are the same move.
    const b = board([
      [[1], [1], []],
      [[2], [], []],
    ]);
    expect(legalMoves(b).filter((m) => m.fromShelf === 0)).toHaveLength(1);
  });

  it("keeps slots that show the same item but differ behind it", () => {
    const b = board([
      [[8, 1], [9, 1], []],
      [[2], [], []],
    ]);
    expect(legalMoves(b).filter((m) => m.fromShelf === 0)).toHaveLength(2);
  });

  it("only produces moves canMove agrees with", () => {
    const b = board([
      [[1, 4], [2], []],
      [[3], [], []],
      [[5], [6], [7]],
    ]);
    for (const move of legalMoves(b)) expect(canMove(b, move)).toBe(true);
  });
});

describe("isStuck", () => {
  it("is true when every shelf is full and none matches", () => {
    const b = board([
      [[1], [2], [3]],
      [[4], [5], [6]],
    ]);
    expect(isStuck(b)).toBe(true);
  });

  it("is false when the board is finished", () => {
    expect(isStuck(board([[[], [], []]]))).toBe(false);
  });

  it("is false while a move remains", () => {
    const b = board([
      [[1], [2], []],
      [[3], [], []],
    ]);
    expect(isStuck(b)).toBe(false);
  });
});

describe("canonicalKey", () => {
  it("ignores which shelf is which", () => {
    const a = board([
      [[1], [2], []],
      [[3], [], []],
    ]);
    const b = board([
      [[3], [], []],
      [[1], [2], []],
    ]);
    expect(canonicalKey(a)).toBe(canonicalKey(b));
  });

  it("ignores which slot on a shelf holds what", () => {
    const a = board([[[1], [2], []]]);
    const b = board([[[2], [], [1]]]);
    expect(canonicalKey(a)).toBe(canonicalKey(b));
  });

  it("separates boards that differ in depth order", () => {
    expect(canonicalKey(board([[[1, 2], [], []]]))).not.toBe(
      canonicalKey(board([[[2, 1], [], []]])),
    );
  });
});

describe("remaining / cloneBoard", () => {
  it("counts every item still on the board", () => {
    expect(remaining(board([[[1, 2], [3], []], [[4], [], []]]))).toBe(4);
  });

  it("clones independently", () => {
    const b = board([[[1], [], []]]);
    const copy = cloneBoard(b);
    copy.shelves[0][0].push(9);
    expect(b.shelves[0][0]).toEqual([1]);
  });
});
