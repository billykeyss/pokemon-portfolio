import { describe, expect, it } from "vitest";
import { columnAt, itemSlot, layoutShelf, type Rect } from "./layout";

const W = 400;
const H = 620;

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutShelf", () => {
  it("creates one box per column and per tray slot", () => {
    const l = layoutShelf(4, 5, 7, W, H);
    expect(l.columns).toHaveLength(4);
    expect(l.tray).toHaveLength(7);
  });

  it("keeps everything on the canvas", () => {
    for (const [cols, depth, tray] of [
      [3, 3, 7],
      [6, 4, 5],
      [6, 8, 7],
    ] as const) {
      const l = layoutShelf(cols, depth, tray, W, H);
      for (const box of [...l.columns, ...l.tray]) {
        expect(box.x).toBeGreaterThanOrEqual(-0.001);
        expect(box.y).toBeGreaterThanOrEqual(-0.001);
        expect(box.x + box.w).toBeLessThanOrEqual(W + 0.001);
        expect(box.y + box.h).toBeLessThanOrEqual(H + 0.001);
      }
    }
  });

  it("never overlaps two columns", () => {
    const l = layoutShelf(6, 4, 7, W, H);
    for (let i = 0; i < l.columns.length; i++) {
      for (let j = i + 1; j < l.columns.length; j++) {
        expect(overlaps(l.columns[i], l.columns[j])).toBe(false);
      }
    }
  });

  it("never overlaps two tray slots", () => {
    const l = layoutShelf(4, 4, 7, W, H);
    for (let i = 0; i < l.tray.length; i++) {
      for (let j = i + 1; j < l.tray.length; j++) {
        expect(overlaps(l.tray[i], l.tray[j])).toBe(false);
      }
    }
  });

  it("keeps the tray clear of the shelves", () => {
    const l = layoutShelf(5, 5, 7, W, H);
    const lowestColumn = Math.max(...l.columns.map((c) => c.y + c.h));
    expect(l.tray[0].y).toBeGreaterThanOrEqual(lowestColumn - 0.001);
  });

  it("sizes shelf goods to their columns", () => {
    const l = layoutShelf(5, 4, 7, W, H);
    expect(l.columns[0].w).toBe(l.item);
  });

  it("keeps tray slots square", () => {
    const l = layoutShelf(5, 4, 7, W, H);
    expect(l.tray[0].w).toBe(l.trayItem);
    expect(l.tray[0].h).toBe(l.trayItem);
  });

  it("does not let a crowded tray shrink the shelves", () => {
    // The tray always holds more slots across the same width, so a shared size
    // would leave the shelves — the part being read — needlessly small.
    const l = layoutShelf(3, 3, 7, W, H);
    expect(l.item).toBeGreaterThan(l.trayItem);
  });

  it("centres both rows", () => {
    const l = layoutShelf(4, 4, 6, W, H);
    const colRight = W - (l.columns[3].x + l.columns[3].w);
    expect(Math.abs(l.columns[0].x - colRight)).toBeLessThan(0.001);

    const trayRight = W - (l.tray[5].x + l.tray[5].w);
    expect(Math.abs(l.tray[0].x - trayRight)).toBeLessThan(0.001);
  });

  it("survives a cramped canvas without collapsing", () => {
    const l = layoutShelf(6, 6, 7, 200, 240);
    expect(l.item).toBeGreaterThan(0);
    expect(l.columns.every((c) => c.w > 0 && c.h > 0)).toBe(true);
  });
});

describe("itemSlot", () => {
  const l = layoutShelf(4, 5, 7, W, H);

  it("puts the reachable item at the bottom, nearest the tray", () => {
    const front = itemSlot(l, 0, 0);
    const behind = itemSlot(l, 0, 1);
    expect(front.y).toBeGreaterThan(behind.y);
  });

  it("keeps the front item inside its column", () => {
    const front = itemSlot(l, 2, 0);
    const box = l.columns[2];
    expect(front.y + front.h).toBeLessThanOrEqual(box.y + box.h + 0.001);
    expect(front.x).toBe(box.x);
  });

  it("steps back by a consistent amount", () => {
    const a = itemSlot(l, 0, 0).y - itemSlot(l, 0, 1).y;
    const b = itemSlot(l, 0, 1).y - itemSlot(l, 0, 2).y;
    expect(a).toBeCloseTo(b);
  });
});

describe("columnAt", () => {
  const l = layoutShelf(5, 4, 7, W, H);

  it("round-trips the centre of every column", () => {
    for (let i = 0; i < l.columns.length; i++) {
      const box = l.columns[i];
      expect(columnAt(l, box.x + box.w / 2, box.y + box.h / 2)).toBe(i);
    }
  });

  it("returns null away from the shelves", () => {
    expect(columnAt(l, -80, -80)).toBeNull();
    expect(columnAt(l, W + 80, H + 80)).toBeNull();
  });

  it("returns null down in the tray band", () => {
    expect(columnAt(l, l.tray[0].x + 1, l.tray[0].y + l.tray[0].h / 2)).toBeNull();
  });
});
