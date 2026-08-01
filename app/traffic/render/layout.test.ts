import { describe, expect, it } from "vitest";
import { cellAt, cellRect, layoutBoard, vehicleRect } from "./layout";

const W = 400;
const H = 520;
const SIZE = 6;
const layout = layoutBoard(SIZE, 2, W, H);

describe("layoutBoard", () => {
  it("keeps the whole board on the canvas", () => {
    expect(layout.originX).toBeGreaterThanOrEqual(0);
    expect(layout.originY).toBeGreaterThanOrEqual(0);
    expect(layout.originX + layout.cell * SIZE).toBeLessThanOrEqual(W);
    expect(layout.originY + layout.cell * SIZE).toBeLessThanOrEqual(H);
  });

  it("centres the board", () => {
    const right = W - (layout.originX + layout.cell * SIZE);
    expect(Math.abs(layout.originX - right)).toBeLessThanOrEqual(1);
  });

  it("uses square cells", () => {
    const rect = cellRect(layout, 0, 0);
    expect(rect.w).toBe(rect.h);
  });

  it("leaves room beside the board for the exit lane", () => {
    expect(layout.cell * SIZE).toBeLessThan(Math.min(W, H));
  });

  it("survives a tiny canvas without collapsing to zero", () => {
    const tiny = layoutBoard(SIZE, 2, 40, 40);
    expect(tiny.cell).toBeGreaterThan(0);
    expect(tiny.wall).toBeGreaterThan(0);
  });

  it("scales the cell to the smaller canvas dimension", () => {
    const wide = layoutBoard(SIZE, 2, 900, 300);
    expect(wide.cell * SIZE).toBeLessThanOrEqual(300);
  });
});

describe("cellRect", () => {
  it("tiles the board without gaps", () => {
    const a = cellRect(layout, 1, 1);
    const b = cellRect(layout, 1, 2);
    expect(a.x + a.w).toBe(b.x);
  });

  it("advances down a row by exactly one cell", () => {
    const a = cellRect(layout, 1, 1);
    const b = cellRect(layout, 2, 1);
    expect(b.y - a.y).toBe(layout.cell);
  });
});

describe("vehicleRect", () => {
  it("stretches a horizontal vehicle across its length", () => {
    const rect = vehicleRect(layout, { row: 2, col: 1, len: 3, horizontal: true });
    expect(rect.w).toBe(layout.cell * 3);
    expect(rect.h).toBe(layout.cell);
  });

  it("stretches a vertical vehicle down its length", () => {
    const rect = vehicleRect(layout, { row: 1, col: 4, len: 2, horizontal: false });
    expect(rect.w).toBe(layout.cell);
    expect(rect.h).toBe(layout.cell * 2);
  });

  it("shifts a horizontal vehicle along x by the offset", () => {
    const base = vehicleRect(layout, { row: 2, col: 1, len: 2, horizontal: true });
    const moved = vehicleRect(layout, { row: 2, col: 1, len: 2, horizontal: true }, 1.5);
    expect(moved.x - base.x).toBeCloseTo(layout.cell * 1.5);
    expect(moved.y).toBe(base.y);
  });

  it("shifts a vertical vehicle along y by the offset", () => {
    const base = vehicleRect(layout, { row: 1, col: 4, len: 2, horizontal: false });
    const moved = vehicleRect(layout, { row: 1, col: 4, len: 2, horizontal: false }, -1);
    expect(moved.y - base.y).toBeCloseTo(-layout.cell);
    expect(moved.x).toBe(base.x);
  });
});

describe("cellAt", () => {
  it("round-trips the centre of every cell", () => {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const rect = cellRect(layout, row, col);
        expect(cellAt(layout, rect.x + rect.w / 2, rect.y + rect.h / 2)).toEqual({
          row,
          col,
        });
      }
    }
  });

  it("returns null off the board", () => {
    expect(cellAt(layout, -50, -50)).toBeNull();
    expect(cellAt(layout, W + 50, H + 50)).toBeNull();
  });

  it("returns null just past the last cell", () => {
    const last = cellRect(layout, SIZE - 1, SIZE - 1);
    expect(cellAt(layout, last.x + last.w + 2, last.y + 2)).toBeNull();
  });
});
