import { describe, expect, it } from "vitest";
import { layoutShelves, shelfAt, slotAt, slotRect, type Rect } from "./layout";
import { SHELF_WIDTH } from "../engine/types";

const W = 400;
const H = 620;
const COUNTS = [4, 5, 6, 7, 8, 9, 10, 12];

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutShelves", () => {
  it("makes one box per shelf", () => {
    expect(layoutShelves(9, W, H).shelves).toHaveLength(9);
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
    for (const count of COUNTS) {
      const l = layoutShelves(count, W, H);
      for (let i = 0; i < l.shelves.length; i++) {
        for (let j = i + 1; j < l.shelves.length; j++) {
          expect(overlaps(l.shelves[i], l.shelves[j])).toBe(false);
        }
      }
    }
  });

  it("uses one cabinet for a short wall and two for a tall one", () => {
    expect(layoutShelves(4, W, H).columns).toBe(1);
    expect(layoutShelves(9, W, H).columns).toBe(2);
  });

  it("makes added shelves free once there are two cabinets", () => {
    // The whole reason for a second cabinet. A single column of three-slot
    // shelves is height-bound long before it is width-bound, so every shelf
    // added used to cost item size. Across two cabinets width binds instead,
    // and width does not care how many rows there are — so six shelves and
    // twelve draw their goods at exactly the same size.
    const six = layoutShelves(6, W, H);
    const twelve = layoutShelves(12, W, H);

    expect(six.columns).toBe(2);
    expect(twelve.columns).toBe(2);
    expect(twelve.item).toBeCloseTo(six.item, 5);
  });

  it("centres the whole block of cabinets", () => {
    const l = layoutShelves(10, W, H);
    const left = Math.min(...l.shelves.map((s) => s.x));
    const right = Math.max(...l.shelves.map((s) => s.x + s.w));
    expect(Math.abs(left - (W - right))).toBeLessThan(0.001);
  });

  it("lines rows up across both cabinets", () => {
    const l = layoutShelves(8, W, H);
    expect(l.shelves[0].y).toBeCloseTo(l.shelves[1].y);
    expect(l.shelves[2].y).toBeCloseTo(l.shelves[3].y);
    expect(l.shelves[2].y).toBeGreaterThan(l.shelves[0].y);
  });

  it("gives every cabinet a frame that encloses its shelves", () => {
    const l = layoutShelves(9, W, H);
    expect(l.cabinets).toHaveLength(l.columns);

    for (const shelf of l.shelves) {
      const inside = l.cabinets.some(
        (c) =>
          shelf.x >= c.x - 0.001 &&
          shelf.x + shelf.w <= c.x + c.w + 0.001 &&
          shelf.y >= c.y - 0.001,
      );
      expect(inside).toBe(true);
    }
  });

  it("leaves floor below the cabinets for the librarian", () => {
    const l = layoutShelves(9, W, H);
    const lowest = Math.max(...l.shelves.map((s) => s.y + s.h));
    expect(l.floorY).toBeGreaterThan(lowest);
    expect(l.floorY).toBeLessThan(H);
  });

  it("survives a cramped canvas", () => {
    const l = layoutShelves(12, 180, 220);
    expect(l.item).toBeGreaterThan(0);
    expect(l.plank).toBeGreaterThan(0);
  });

  it("sizes to whichever of width or height binds", () => {
    const wide = layoutShelves(9, 1200, 300);
    for (const box of wide.shelves) {
      expect(box.y + box.h).toBeLessThanOrEqual(300.001);
    }
  });
});

describe("slotRect", () => {
  const l = layoutShelves(8, W, H);

  it("lays three slots across a shelf without overlapping", () => {
    for (let i = 0; i < SHELF_WIDTH - 1; i++) {
      const a = slotRect(l, 0, i);
      const b = slotRect(l, 0, i + 1);
      expect(a.x + a.w).toBeLessThanOrEqual(b.x + 0.001);
    }
  });

  it("keeps every slot inside its shelf box", () => {
    const box = l.shelves[3];
    for (let i = 0; i < SHELF_WIDTH; i++) {
      const rect = slotRect(l, 3, i);
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
  const l = layoutShelves(9, W, H);

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
  const l = layoutShelves(9, W, H);

  it("finds the shelf under a slot", () => {
    const rect = slotRect(l, 4, 1);
    expect(shelfAt(l, rect.x + rect.w / 2, rect.y + rect.h / 2)).toBe(4);
  });

  it("round-trips every shelf, so no shelf is unreachable", () => {
    for (let shelf = 0; shelf < l.shelves.length; shelf++) {
      const box = l.shelves[shelf];
      expect(shelfAt(l, box.x + box.w / 2, box.y + box.h / 2)).toBe(shelf);
    }
  });

  it("does not let an overshoot land on the neighbouring cabinet", () => {
    // Two cabinets sit side by side; generous horizontal padding would make a
    // tap near the gap place goods on the wrong one.
    const left = l.shelves[0];
    const right = l.shelves[1];
    const midGap = (left.x + left.w + right.x) / 2;
    const hit = shelfAt(l, midGap, left.y + left.h / 2);
    expect(hit === null || hit === 0 || hit === 1).toBe(true);
  });

  it("returns null well away from any shelf", () => {
    expect(shelfAt(l, W * 2, H * 2)).toBeNull();
  });
});
