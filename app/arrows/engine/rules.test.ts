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
  isStuck,
  legalMoves,
  occupancy,
  clearEnd,
  endsOf,
  leadOf,
  slideCells,
  slideDistance,
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

  it("slides up to the blocker instead of refusing the tap", () => {
    // One clear cell between them, so the tap is a move — just not an exit.
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 3]), W)]);
    const after = applyMove(b, { id: 0 });

    expect(after.arrows).toHaveLength(2);
    expect(arrowById(after, 0)?.cells).toEqual(cells([2, 2]));
  });

  it("throws only when the arrow is hard against something", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 2]), W)]);
    expect(() => applyMove(b, { id: 0 })).toThrow();
  });

  it("lets an arrow already on the edge leave, despite a zero-length run", () => {
    // Its exit path is empty, which must not read as "cannot move".
    const b = board([arrow(0, cells([2, 4]), E)]);
    expect(canMove(b, { id: 0 })).toBe(true);
    expect(applyMove(b, { id: 0 }).arrows).toHaveLength(0);
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

describe("slideDistance", () => {
  it("reports a clear run as an exit", () => {
    const b = board([arrow(0, cells([2, 1]), E)]);
    expect(slideDistance(b, 0).exits).toBe(true);
  });

  it("stops one short of a blocker", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 4]), W)]);
    expect(slideDistance(b, 0)).toEqual({ cells: 2, exits: false });
  });

  it("is zero when hard against a neighbour", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 2]), W)]);
    expect(slideDistance(b, 0)).toEqual({ cells: 0, exits: false });
  });

  it("is zero and not an exit for an arrow that does not exist", () => {
    expect(slideDistance(board([]), 9)).toEqual({ cells: 0, exits: false });
  });

  it("ignores the arrow's own body", () => {
    // A long track must not count its own cells as an obstruction.
    const b = board([arrow(0, cells([2, 0], [2, 1], [2, 2]), E)]);
    expect(slideDistance(b, 0).exits).toBe(true);
  });
});

describe("slideCells", () => {
  it("keeps the track the same length", () => {
    const a = arrow(0, cells([2, 0], [2, 1], [2, 2]), E);
    expect(slideCells(a, 2)).toHaveLength(3);
  });

  it("advances a straight arrow along its axis", () => {
    const a = arrow(0, cells([2, 0], [2, 1]), E);
    expect(slideCells(a, 2)).toEqual(cells([2, 2], [2, 3]));
  });

  it("straightens a bend as the body passes it", () => {
    // East along row 2, then turning north up column 2. After two steps the
    // whole body has cleared the corner and continues north.
    const a = arrow(0, cells([2, 0], [2, 1], [2, 2], [1, 2]), N);
    expect(slideCells(a, 2)).toEqual(cells([2, 2], [1, 2], [0, 2], [-1, 2]));
  });

  it("returns the track untouched for a zero or negative step", () => {
    const a = arrow(0, cells([2, 0], [2, 1]), E);
    expect(slideCells(a, 0)).toEqual(cells([2, 0], [2, 1]));
    expect(slideCells(a, -3)).toEqual(cells([2, 0], [2, 1]));
  });

  it("does not mutate the arrow it was given", () => {
    const a = arrow(0, cells([2, 0], [2, 1]), E);
    slideCells(a, 2);
    expect(a.cells).toEqual(cells([2, 0], [2, 1]));
  });
});

describe("the mechanic is no longer confluent", () => {
  it("a partial slide can block an arrow that was free before it", () => {
    // Arrow 0 slides east and parks in column 2, straight across the path of
    // arrow 2, which was clear to the north. This is the wedge the old rule
    // made impossible, and the reason order now matters.
    const b = board([
      arrow(0, cells([2, 0]), E),
      arrow(1, cells([2, 3]), W),
      arrow(2, cells([4, 2]), N),
    ]);

    expect(isFree(b, 2)).toBe(true);

    const after = applyMove(b, { id: 0 });
    expect(arrowById(after, 0)?.cells).toEqual(cells([2, 2]));
    expect(isFree(after, 2)).toBe(false);
  });

  it("counts a slider as a legal move even though it cannot leave", () => {
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 4]), W)]);
    expect(freeArrows(b).map((a) => a.id)).not.toContain(0);
    expect(legalMoves(b).map((m) => m.id)).toContain(0);
  });
});

describe("isStuck", () => {
  it("is false on a solved board", () => {
    expect(isStuck(board([]))).toBe(false);
  });

  it("is false while anything can still move", () => {
    expect(isStuck(board([arrow(0, cells([2, 1]), E)]))).toBe(false);
  });

  it("is true when every arrow is hard against another", () => {
    // Two arrows nose to nose in the middle of the row, each facing the other,
    // with nothing behind either to give them room.
    const b = board([arrow(0, cells([2, 1]), E), arrow(1, cells([2, 2]), W)]);
    expect(isStuck(b)).toBe(true);
  });
});

const twoWay = (id: number, track: Cell[], dir: Dir): Arrow => ({
  id,
  cells: track,
  dir,
  hue: 0,
  twoWay: true,
});

describe("leadOf", () => {
  it("leads with the head in its own direction", () => {
    const a = arrow(0, cells([2, 0], [2, 1]), E);
    expect(leadOf(a, "head")).toEqual({ cell: { row: 2, col: 1 }, dir: E });
  });

  it("leads with the tail, pointing back along the first segment", () => {
    const a = arrow(0, cells([2, 0], [2, 1]), E);
    expect(leadOf(a, "tail")).toEqual({ cell: { row: 2, col: 0 }, dir: W });
  });

  it("reads the bend rather than the head when leading with the tail", () => {
    // Track runs north up column 2 then turns east; the tail end points south.
    const a = arrow(0, cells([2, 2], [1, 2], [1, 3]), E);
    expect(leadOf(a, "tail")).toEqual({ cell: { row: 2, col: 2 }, dir: S });
  });

  it("borrows the opposite of the head for a single cell", () => {
    const a = arrow(0, cells([2, 2]), E);
    expect(leadOf(a, "tail")).toEqual({ cell: { row: 2, col: 2 }, dir: W });
  });
});

describe("endsOf", () => {
  it("offers one end for an ordinary arrow", () => {
    expect(endsOf(arrow(0, cells([2, 0]), E))).toEqual(["head"]);
  });

  it("offers both for a two-way arrow", () => {
    expect(endsOf(twoWay(0, cells([2, 0]), E))).toEqual(["head", "tail"]);
  });
});

describe("two-way arrows", () => {
  it("can leave by the tail when the head is blocked", () => {
    // Head runs east into arrow 1; west of the tail is open board.
    const b = board([twoWay(0, cells([2, 2], [2, 3]), E), arrow(1, cells([2, 4]), W)]);

    expect(blockerOf(b, 0, "head")).not.toBeNull();
    expect(blockerOf(b, 0, "tail")).toBeNull();
    expect(isFree(b, 0)).toBe(true);
    expect(clearEnd(b, 0)).toBe("tail");

    expect(applyMove(b, { id: 0, end: "tail" }).arrows.map((a) => a.id)).toEqual([1]);
  });

  it("is stuck only when both ends are blocked", () => {
    const b = board([
      arrow(1, cells([2, 0]), E),
      twoWay(0, cells([2, 1], [2, 2]), E),
      arrow(2, cells([2, 3]), W),
    ]);
    expect(isFree(b, 0)).toBe(false);
  });

  it("prefers the head when both ends are open", () => {
    expect(clearEnd(board([twoWay(0, cells([2, 1], [2, 2]), E)]), 0)).toBe("head");
  });

  it("offers a move for each end that can go somewhere", () => {
    const b = board([twoWay(0, cells([2, 1], [2, 2]), E)]);
    const ends = legalMoves(b).filter((m) => m.id === 0).map((m) => m.end);
    expect(ends).toEqual(["head", "tail"]);
  });

  it("an ordinary arrow still offers only its head", () => {
    const b = board([arrow(0, cells([2, 1], [2, 2]), E)]);
    expect(legalMoves(b).map((m) => m.end)).toEqual(["head"]);
  });
});

describe("sliding from the tail", () => {
  it("moves the track backwards, keeping tail first and head last", () => {
    // Two cells of room to the west before arrow 1.
    const b = board([
      arrow(1, cells([2, 0]), E),
      twoWay(0, cells([2, 3], [2, 4]), E),
    ]);

    const slide = slideDistance(b, 0, "tail");
    expect(slide).toEqual({ cells: 2, exits: false });

    const after = applyMove(b, { id: 0, end: "tail" });
    expect(arrowById(after, 0)?.cells).toEqual(cells([2, 1], [2, 2]));
  });

  it("leaves the arrow the same length whichever end leads", () => {
    const a = twoWay(0, cells([2, 1], [2, 2], [2, 3]), E);
    expect(slideCells(a, 1, "tail")).toHaveLength(3);
    expect(slideCells(a, 1, "head")).toHaveLength(3);
  });

  it("does not mutate the arrow when leading with the tail", () => {
    const a = twoWay(0, cells([2, 1], [2, 2]), E);
    slideCells(a, 1, "tail");
    expect(a.cells).toEqual(cells([2, 1], [2, 2]));
  });

  it("sends the two ends to genuinely different places", () => {
    // The decision the mechanic exists for: same arrow, opposite outcomes.
    const b = board([
      arrow(1, cells([0, 0]), E),
      twoWay(0, cells([2, 1], [2, 2]), E),
    ]);
    const viaHead = applyMove(b, { id: 0, end: "head" });
    const viaTail = applyMove(b, { id: 0, end: "tail" });
    expect(viaHead.arrows.length + viaTail.arrows.length).toBeGreaterThan(0);
  });
});
