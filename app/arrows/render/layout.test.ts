import { describe, expect, it } from "vitest";
import { cellAt, cellRect, layoutBoard } from "./layout";

const W = 400;
const H = 560;

describe("layoutBoard", () => {
  it("keeps the whole board on the canvas", () => {
    for (const size of [5, 6, 7, 8]) {
      const l = layoutBoard(size, W, H);
      expect(l.originX).toBeGreaterThanOrEqual(0);
      expect(l.originY).toBeGreaterThanOrEqual(0);
      expect(l.originX + l.cell * size).toBeLessThanOrEqual(W);
      expect(l.originY + l.cell * size).toBeLessThanOrEqual(H);
    }
  });

  it("centres the board", () => {
    const l = layoutBoard(6, W, H);
    const right = W - (l.originX + l.cell * 6);
    expect(Math.abs(l.originX - right)).toBeLessThanOrEqual(1);
  });

  it("uses square cells", () => {
    const rect = cellRect(layoutBoard(7, W, H), 0, 0);
    expect(rect.w).toBe(rect.h);
  });

  it("leaves a margin, since arrows fly out past the edge", () => {
    const l = layoutBoard(6, W, H);
    expect(l.cell * 6).toBeLessThan(Math.min(W, H));
  });

  it("scales to the smaller dimension on a wide canvas", () => {
    const wide = layoutBoard(6, 1200, 300);
    expect(wide.cell * 6).toBeLessThanOrEqual(300);
  });

  it("survives a tiny canvas without collapsing", () => {
    expect(layoutBoard(8, 40, 40).cell).toBeGreaterThan(0);
  });
});

describe("cellRect", () => {
  const l = layoutBoard(6, W, H);

  it("tiles without gaps", () => {
    const a = cellRect(l, 1, 1);
    const b = cellRect(l, 1, 2);
    expect(a.x + a.w).toBe(b.x);
  });

  it("advances a row by exactly one cell", () => {
    expect(cellRect(l, 2, 1).y - cellRect(l, 1, 1).y).toBe(l.cell);
  });
});

describe("cellAt", () => {
  const l = layoutBoard(6, W, H);

  it("round-trips the centre of every cell", () => {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const rect = cellRect(l, row, col);
        expect(cellAt(l, rect.x + rect.w / 2, rect.y + rect.h / 2)).toEqual({ row, col });
      }
    }
  });

  it("returns null off the board", () => {
    expect(cellAt(l, -40, -40)).toBeNull();
    expect(cellAt(l, W + 40, H + 40)).toBeNull();
  });

  it("does not reach past a cell into its neighbour", () => {
    // A misjudged tap costs a heart, so the hit box must not be forgiving in a
    // way that spends the player's mistakes for them.
    const rect = cellRect(l, 0, 0);
    expect(cellAt(l, rect.x + rect.w + 1, rect.y + rect.h / 2)).toEqual({
      row: 0,
      col: 1,
    });
  });

  it("returns null just past the last cell", () => {
    const last = cellRect(l, 5, 5);
    expect(cellAt(l, last.x + last.w + 2, last.y + 2)).toBeNull();
  });
});
