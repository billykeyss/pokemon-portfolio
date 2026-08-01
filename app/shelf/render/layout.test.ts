import { describe, expect, it } from "vitest";
import { layoutShelves, shelfAt, slotAt, slotRect, type Rect } from "./layout";
import { SHELF_WIDTH } from "../engine/types";

const W = 400;
const H = 620;
const COUNTS = [4, 5, 6, 7, 8];

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutShelves", () => {
  it("makes one box per shelf", () => {
    expect(layoutShelves(6, W, H).shelves).toHaveLength(6);
  });

  it("keeps every shelf on the canvas", () => {
    for (const count of COUNTS) {
      const l = layoutShelves(count, W, H);
      for (const box of l.shelves) {
        expect(box.x).toBeGreaterThanOrEqual(-0.001);
        expect(box.y).toBeGreaterThanOrEqual(-0.001);
        expect(box.x + box.w).toBeLessThanOrEqual(W + 0.001);
        expect(box.y + box.h).toBeLessThanOrEqual(H + 0.001);
      }
    }
  });

  it("never overlaps two shelves", () => {
    const l = layoutShelves(7, W, H);
    for (let i = 0; i < l.shelves.length; i++) {
      for (let j = i + 1; j < l.shelves.length; j++) {
        expect(overlaps(l.shelves[i], l.shelves[j])).toBe(false);
      }
    }
  });

  it("centres the shelves horizontally", () => {
    const l = layoutShelves(5, W, H);
    const box = l.shelves[0];
    expect(box.x).toBeCloseTo(W - (box.x + box.w));
  });

  it("leaves a gap between shelves for the plank", () => {
    const l = layoutShelves(6, W, H);
    const gap = l.shelves[1].y - (l.shelves[0].y + l.shelves[0].h);
    expect(gap).toBeGreaterThan(l.plank);
  });

  it("shrinks items as shelves are added, rather than overflowing", () => {
    expect(layoutShelves(8, W, H).item).toBeLessThan(layoutShelves(4, W, H).item);
  });

  it("survives a cramped canvas", () => {
    const l = layoutShelves(8, 180, 220);
    expect(l.item).toBeGreaterThan(0);
    expect(l.plank).toBeGreaterThan(0);
  });

  it("sizes to whichever of width or height binds", () => {
    // A short, wide canvas must be limited by height, not width.
    const wide = layoutShelves(6, 1200, 300);
    expect(wide.shelves[5].y + wide.shelves[5].h).toBeLessThanOrEqual(300.001);
  });
});

describe("slotRect", () => {
  const l = layoutShelves(5, W, H);

  it("lays three slots across a shelf without overlapping", () => {
    for (let i = 0; i < SHELF_WIDTH - 1; i++) {
      const a = slotRect(l, 0, i);
      const b = slotRect(l, 0, i + 1);
      expect(a.x + a.w).toBeLessThanOrEqual(b.x + 0.001);
    }
  });

  it("keeps every slot inside its shelf box", () => {
    const box = l.shelves[2];
    for (let i = 0; i < SHELF_WIDTH; i++) {
      const rect = slotRect(l, 2, i);
      expect(rect.x).toBeGreaterThanOrEqual(box.x - 0.001);
      expect(rect.x + rect.w).toBeLessThanOrEqual(box.x + box.w + 0.001);
      expect(rect.y).toBe(box.y);
    }
  });

  it("makes square slots", () => {
    const rect = slotRect(l, 0, 0);
    expect(rect.w).toBeCloseTo(rect.h);
  });
});

describe("slotAt", () => {
  const l = layoutShelves(6, W, H);

  it("round-trips the centre of every slot", () => {
    for (let shelf = 0; shelf < l.shelves.length; shelf++) {
      for (let slot = 0; slot < SHELF_WIDTH; slot++) {
        const rect = slotRect(l, shelf, slot);
        expect(slotAt(l, rect.x + rect.w / 2, rect.y + rect.h / 2)).toEqual({
          shelf,
          slot,
        });
      }
    }
  });

  it("returns null away from the shelves", () => {
    expect(slotAt(l, -60, -60)).toBeNull();
    expect(slotAt(l, W + 60, H + 60)).toBeNull();
  });
});

describe("shelfAt", () => {
  const l = layoutShelves(6, W, H);

  it("finds the shelf under a slot", () => {
    const rect = slotRect(l, 3, 1);
    expect(shelfAt(l, rect.x + rect.w / 2, rect.y + rect.h / 2)).toBe(3);
  });

  it("accepts a tap just off the end of a shelf, so placing is forgiving", () => {
    const box = l.shelves[2];
    expect(shelfAt(l, box.x - l.item * 0.3, box.y + box.h / 2)).toBe(2);
  });

  it("returns null well away from any shelf", () => {
    expect(shelfAt(l, W * 2, H * 2)).toBeNull();
  });
});
