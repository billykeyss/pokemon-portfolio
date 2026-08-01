import { describe, expect, it } from "vitest";
import {
  applyMove,
  arrowAt,
  arrowById,
  blockerOf,
  canMove,
  cloneBoard,
  coverage,
  exitPath,
  freeArrows,
  isFree,
  isSolved,
  legalMoves,
  occupancy,
} from "./rules";
import { headOf, type Arrow, type Board, type Cell, type Dir } from "./types";

const N = 0 as Dir;
const E = 1 as Dir;
const S = 2 as Dir;
const W = 3 as Dir;

const cells = (...pairs: [number, number][]): Cell[] =>
  pairs.map(([row, col]) => ({ row, col }));

const arrow = (id: number, track: Cell[], dir: Dir): Arrow => ({
  id,
  cells: track,
  dir,
  hue: 0,
});

const board = (arrows: Arrow[], size = 6): Board => ({ size, arrows });

describe("headOf", () => {
  it("is the last cell of the track", () => {
    expect(headOf(arrow(0, cells([3, 1], [3, 2], [2, 2]), N))).toEqual({
      row: 2,
      col: 2,
    });
  });
});

describe("exitPath", () => {
  it("runs from beyond the head to the edge", () => {
    const b = board([arrow(0, cells([2, 0], [2, 1]), E)]);
    expect(exitPath(b, b.arrows[0])).toEqual(cells([2, 2], [2, 3], [2, 4], [2, 5]));
  });

  it("ignores the arrow's own body", () => {
    // The tail follows the head along the track, so its own cells never block.
    const b = board([arrow(0, cells([2, 4], [2, 3], [2, 2]), W)]);
    expect(exitPath(b, b.arrows[0])).toEqual(cells([2, 1], [2, 0]));
  });

  it("is empty for a head already facing off the edge", () => {
    const b = board([arrow(0, cells([0, 0]), N)]);
    expect(exitPath(b, b.arrows[0])).toEqual([]);
  });
});

describe("blockerOf", () => {
  it("is null when the run is clear", () => {
    expect(blockerOf(board([arrow(0, cells([2, 0], [2, 1]), E)]), 0)).toBeNull();
  });

  it("names an arrow whose body lies in the way", () => {
    const b = board([
      arrow(0, cells([2, 0], [2, 1]), E),
      arrow(1, cells([0, 3], [1, 3], [2, 3]), S),
    ]);
    expect(blockerOf(b, 0)?.id).toBe(1);
  });

  it("names the nearest blocker, not a later one", () => {
    const b = board([
      arrow(0, cells([2, 0]), E),
      arrow(1, cells([2, 2]), N),
      arrow(2, cells([2, 4]), N),
    ]);
    expect(blockerOf(b, 0)?.id).toBe(1);
  });

  it("never reports an arrow as blocking itself", () => {
    // A track that doubles back crosses its own row; that must not count.
    const b = board([arrow(0, cells([2, 3], [1, 3], [1, 2], [2, 2]), S)]);
    expect(blockerOf(b, 0)).toBeNull();
  });

  it("ignores arrows off the run", () => {
    const b = board([arrow(0, cells([2, 0]), E), arrow(1, cells([3, 2]), N)]);
    expect(blockerOf(b, 0)).toBeNull();
  });
});

describe("isFree / freeArrows", () => {
  it("two arrows facing each other block each other", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 3]), W)]);
    expect(isFree(b, 0)).toBe(false);
    expect(isFree(b, 1)).toBe(false);
    expect(freeArrows(b)).toEqual([]);
  });

  it("arrows facing away from each other are both free", () => {
    const b = board([arrow(0, cells([2, 1]), W), arrow(1, cells([2, 3]), E)]);
    expect(freeArrows(b)).toHaveLength(2);
  });

  it("counts a head on the edge pointing out as free", () => {
    expect(isFree(board([arrow(0, cells([1, 0], [0, 0]), N)]), 0)).toBe(true);
  });
});

describe("occupancy", () => {
  it("marks every cell of a track, not just the head", () => {
    const grid = occupancy(board([arrow(7, cells([1, 1], [1, 2], [2, 2]), S)]));
    expect(grid[1 * 6 + 1]).toBe(7);
    expect(grid[1 * 6 + 2]).toBe(7);
    expect(grid[2 * 6 + 2]).toBe(7);
    expect(grid[0]).toBe(-1);
  });
});

describe("applyMove", () => {
  it("removes the whole track", () => {
    const after = applyMove(
      board([arrow(0, cells([2, 0], [2, 1]), E), arrow(1, cells([5, 5]), S)]),
      { id: 0 },
    );
    expect(after.arrows.map((a) => a.id)).toEqual([1]);
    expect(coverage(after)).toBe(1);
  });

  it("does not mutate its input", () => {
    const before = board([arrow(0, cells([2, 0], [2, 1]), E)]);
    applyMove(before, { id: 0 });
    expect(before.arrows).toHaveLength(1);
  });

  it("throws rather than releasing a blocked arrow", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 3]), W)]);
    expect(() => applyMove(b, { id: 0 })).toThrow();
  });

  it("unblocks whatever the removed arrow was holding up", () => {
    const b = board([arrow(0, cells([2, 0]), E), arrow(1, cells([1, 2], [2, 2]), S)]);
    expect(isFree(b, 0)).toBe(false);
    expect(isFree(applyMove(b, { id: 1 }), 0)).toBe(true);
  });
});

describe("canMove / legalMoves / isSolved", () => {
  it("agrees with isFree", () => {
    const b = board([
      arrow(0, cells([2, 1]), E),
      arrow(1, cells([2, 3]), W),
      arrow(2, cells([5, 5]), S),
    ]);
    for (const move of legalMoves(b)) expect(canMove(b, move)).toBe(true);
  });

  it("reports an empty board as solved", () => {
    expect(isSolved(board([]))).toBe(true);
    expect(isSolved(board([arrow(0, cells([0, 0]), N)]))).toBe(false);
  });
});

describe("arrowAt", () => {
  it("hits any cell of a track, not only its head", () => {
    const b = board([arrow(4, cells([1, 1], [1, 2], [2, 2]), S)]);
    expect(arrowAt(b, 1, 1)?.id).toBe(4);
    expect(arrowAt(b, 1, 2)?.id).toBe(4);
    expect(arrowAt(b, 0, 0)).toBeNull();
  });
});

describe("arrowById / cloneBoard / coverage", () => {
  it("finds an arrow by id", () => {
    expect(arrowById(board([arrow(4, cells([1, 3]), N)]), 4)?.hue).toBe(0);
    expect(arrowById(board([arrow(4, cells([1, 3]), N)]), 9)).toBeUndefined();
  });

  it("counts every occupied cell", () => {
    expect(
      coverage(board([arrow(0, cells([0, 0], [0, 1]), E), arrow(1, cells([3, 3]), N)])),
    ).toBe(3);
  });

  it("clones independently, tracks included", () => {
    const b = board([arrow(0, cells([1, 1], [1, 2]), E)]);
    const copy = cloneBoard(b);
    copy.arrows[0].cells[0].row = 4;
    expect(b.arrows[0].cells[0].row).toBe(1);
  });
});
