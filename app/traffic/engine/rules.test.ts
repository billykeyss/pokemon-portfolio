import { describe, expect, it } from "vitest";
import {
  applyMove,
  canMove,
  cellsOf,
  cloneBoard,
  fitsOnBoard,
  freeRun,
  isSolved,
  legalMoves,
  occupancy,
  overlaps,
} from "./rules";
import type { Board, Vehicle } from "./types";

const car = (
  id: number,
  row: number,
  col: number,
  horizontal: boolean,
  len = 2,
): Vehicle => ({ id, row, col, len, horizontal, kind: 0 });

const board = (vehicles: Vehicle[], size = 6, exitRow = 2): Board => ({
  size,
  exitRow,
  vehicles,
});

describe("cellsOf", () => {
  it("walks a horizontal vehicle along its row", () => {
    expect(cellsOf(car(0, 2, 1, true, 3))).toEqual([
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  it("walks a vertical vehicle down its column", () => {
    expect(cellsOf(car(0, 1, 4, false, 2))).toEqual([
      { row: 1, col: 4 },
      { row: 2, col: 4 },
    ]);
  });
});

describe("occupancy", () => {
  it("marks each vehicle's cells with its id and leaves the rest empty", () => {
    const grid = occupancy(board([car(0, 2, 0, true), car(1, 0, 3, false)]));
    expect(grid[2 * 6 + 0]).toBe(0);
    expect(grid[2 * 6 + 1]).toBe(0);
    expect(grid[0 * 6 + 3]).toBe(1);
    expect(grid[1 * 6 + 3]).toBe(1);
    expect(grid[5 * 6 + 5]).toBe(-1);
  });
});

describe("freeRun", () => {
  it("stops at the wall", () => {
    expect(freeRun(board([car(0, 2, 3, true)]), 0, 1)).toBe(1);
  });

  it("counts the whole empty row when nothing is in the way", () => {
    expect(freeRun(board([car(0, 2, 0, true)]), 0, 1)).toBe(4);
  });

  it("stops one cell short of a blocker", () => {
    const b = board([car(0, 2, 0, true), car(1, 2, 4, false)]);
    expect(freeRun(b, 0, 1)).toBe(2);
  });

  it("is zero when hard against a blocker", () => {
    const b = board([car(0, 2, 0, true), car(1, 2, 2, false)]);
    expect(freeRun(b, 0, 1)).toBe(0);
  });

  it("measures backwards too", () => {
    expect(freeRun(board([car(0, 2, 3, true)]), 0, -1)).toBe(3);
  });

  it("moves a vertical vehicle along its column", () => {
    expect(freeRun(board([car(0, 0, 4, false)]), 0, 1)).toBe(4);
  });

  it("is zero for an unknown vehicle", () => {
    expect(freeRun(board([car(0, 2, 0, true)]), 99, 1)).toBe(0);
  });
});

describe("canMove", () => {
  it("rejects a zero move", () => {
    expect(canMove(board([car(0, 2, 0, true)]), { id: 0, delta: 0 })).toBe(false);
  });

  it("allows a slide within the free run", () => {
    expect(canMove(board([car(0, 2, 0, true)]), { id: 0, delta: 3 })).toBe(true);
  });

  it("rejects a slide past the free run", () => {
    expect(canMove(board([car(0, 2, 0, true)]), { id: 0, delta: 5 })).toBe(false);
  });

  it("rejects sliding through another vehicle", () => {
    const b = board([car(0, 2, 0, true), car(1, 2, 3, false)]);
    expect(canMove(b, { id: 0, delta: 2 })).toBe(false);
  });
});

describe("applyMove", () => {
  it("slides a horizontal vehicle along its row", () => {
    const after = applyMove(board([car(0, 2, 0, true)]), { id: 0, delta: 2 });
    expect(after.vehicles[0]).toMatchObject({ row: 2, col: 2 });
  });

  it("slides a vertical vehicle down its column", () => {
    const after = applyMove(board([car(0, 0, 4, false)]), { id: 0, delta: 3 });
    expect(after.vehicles[0]).toMatchObject({ row: 3, col: 4 });
  });

  it("does not mutate its input", () => {
    const before = board([car(0, 2, 0, true)]);
    const snapshot = JSON.stringify(before);
    applyMove(before, { id: 0, delta: 2 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("throws on an illegal move rather than corrupting the board", () => {
    expect(() => applyMove(board([car(0, 2, 0, true)]), { id: 0, delta: 9 })).toThrow();
  });

  it("leaves other vehicles untouched", () => {
    const after = applyMove(board([car(0, 2, 0, true), car(1, 0, 5, false)]), {
      id: 0,
      delta: 1,
    });
    expect(after.vehicles[1]).toMatchObject({ row: 0, col: 5 });
  });
});

describe("isSolved", () => {
  it("is true when the player's car touches the right edge", () => {
    expect(isSolved(board([car(0, 2, 4, true)]))).toBe(true);
  });

  it("is false anywhere short of it", () => {
    expect(isSolved(board([car(0, 2, 3, true)]))).toBe(false);
  });

  it("is false when there is no player car", () => {
    expect(isSolved(board([car(5, 2, 4, true)]))).toBe(false);
  });
});

describe("legalMoves", () => {
  it("offers one move per reachable distance in each direction", () => {
    // Alone on row 2 at column 2: two cells left, two right.
    const moves = legalMoves(board([car(0, 2, 2, true)]));
    expect(moves.map((m) => m.delta).sort((a, b) => a - b)).toEqual([-2, -1, 1, 2]);
  });

  it("offers nothing for a boxed-in vehicle", () => {
    const b = board([car(0, 2, 2, true), car(1, 2, 0, true), car(2, 2, 4, true)]);
    expect(legalMoves(b).filter((m) => m.id === 0)).toHaveLength(0);
  });

  it("only produces moves that canMove agrees with", () => {
    const b = board([car(0, 2, 1, true), car(1, 0, 3, false, 3), car(2, 4, 2, true)]);
    for (const move of legalMoves(b)) {
      expect(canMove(b, move)).toBe(true);
    }
  });
});

describe("overlaps", () => {
  it("detects a shared cell", () => {
    expect(overlaps(car(0, 2, 1, true), car(1, 2, 2, false))).toBe(true);
  });

  it("passes vehicles that miss each other", () => {
    expect(overlaps(car(0, 2, 0, true), car(1, 4, 4, false))).toBe(false);
  });
});

describe("fitsOnBoard", () => {
  it("accepts a vehicle inside the grid", () => {
    expect(fitsOnBoard({ size: 6 }, car(0, 2, 4, true))).toBe(true);
  });

  it("rejects one hanging off the right edge", () => {
    expect(fitsOnBoard({ size: 6 }, car(0, 2, 5, true))).toBe(false);
  });

  it("rejects one hanging off the bottom", () => {
    expect(fitsOnBoard({ size: 6 }, car(0, 5, 2, false, 3))).toBe(false);
  });
});

describe("cloneBoard", () => {
  it("produces an independent copy", () => {
    const b = board([car(0, 2, 0, true)]);
    const copy = cloneBoard(b);
    copy.vehicles[0].col = 4;
    expect(b.vehicles[0].col).toBe(0);
  });
});
