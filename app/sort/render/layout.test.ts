import { describe, expect, it } from "vitest";
import { hitTest, layoutBottles, type Layout, type Rect } from "./layout";

const W = 400;
const H = 500;
const COUNTS = [3, 5, 7, 9, 12, 14, 16, 18, 20];

/** A row sized exactly to the canvas lands on zero with float noise attached. */
const EPS = 1e-9;

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutBottles", () => {
  it("returns one entry per bottle, indexed in order", () => {
    const l = layoutBottles(7, 4, W, H);
    expect(l.bottles).toHaveLength(7);
    expect(l.bottles.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("keeps every bottle inside the canvas", () => {
    for (const count of COUNTS) {
      const l = layoutBottles(count, 4, W, H);
      for (const b of l.bottles) {
        expect(b.x).toBeGreaterThanOrEqual(-EPS);
        expect(b.y).toBeGreaterThanOrEqual(-EPS);
        expect(b.x + b.w).toBeLessThanOrEqual(W + EPS);
        expect(b.y + b.h).toBeLessThanOrEqual(H + EPS);
      }
    }
  });

  it("never overlaps two bottles", () => {
    for (const count of COUNTS) {
      const l = layoutBottles(count, 4, W, H);
      for (let i = 0; i < l.bottles.length; i++) {
        for (let j = i + 1; j < l.bottles.length; j++) {
          expect(overlaps(l.bottles[i], l.bottles[j])).toBe(false);
        }
      }
    }
  });

  it("leaves headroom above each bottle for the lift animation", () => {
    const l = layoutBottles(14, 4, W, H);
    for (const b of l.bottles) {
      expect(b.y).toBeGreaterThan(0);
    }
  });

  it("uses a single row for small counts and wraps for large ones", () => {
    expect(layoutBottles(4, 4, W, H).rows).toBe(1);
    expect(layoutBottles(14, 4, W, H).rows).toBeGreaterThan(1);
  });

  it("keeps the widest board on screen and legible", () => {
    // Twenty is the widest the curve produces. Bottles must still be wide
    // enough to read a colour in, not slivers.
    const l = layoutBottles(20, 4, W, H);
    expect(l.rows).toBeGreaterThanOrEqual(3);
    for (const b of l.bottles) {
      expect(b.x).toBeGreaterThanOrEqual(-EPS);
      expect(b.y).toBeGreaterThanOrEqual(-EPS);
      expect(b.x + b.w).toBeLessThanOrEqual(W + EPS);
      expect(b.y + b.h).toBeLessThanOrEqual(H + EPS);
      expect(b.w).toBeGreaterThan(W / 12);
    }
  });

  it("balances bottles across rows rather than stranding one", () => {
    // Eight bottles should split 4/4, not 7/1.
    const l = layoutBottles(8, 4, W, H);
    const byRow = new Map<number, number>();
    for (const b of l.bottles) {
      const key = Math.round(b.y);
      byRow.set(key, (byRow.get(key) ?? 0) + 1);
    }
    expect([...byRow.values()]).toEqual([4, 4]);
  });

  it("sizes a unit to the bottle height divided by capacity", () => {
    const l = layoutBottles(5, 4, W, H);
    expect(l.bottles[0].unitH).toBeCloseTo(l.bottles[0].h / 4);
  });

  it("fills a tall canvas rather than stranding the bottles in a corner", () => {
    // Five bottles on a phone are width-bound; a fixed aspect ratio would leave
    // most of the canvas empty and the row pinned to one edge.
    const l = layoutBottles(5, 4, 400, 560);
    const b = l.bottles[0];
    expect(b.h).toBeGreaterThan(560 * 0.35);

    const above = b.y;
    const below = 560 - (b.y + b.h);
    expect(Math.abs(above - below)).toBeLessThan(b.h * 0.5);
  });

  it("keeps bottle proportions within the aspect range", () => {
    for (const [count, w, h] of [
      [3, 400, 560],
      [5, 400, 560],
      [14, 400, 560],
      [14, 200, 200],
      [4, 800, 300],
    ] as const) {
      const b = layoutBottles(count, 4, w, h).bottles[0];
      expect(b.h / b.w).toBeGreaterThanOrEqual(2.2 - 1e-9);
      expect(b.h / b.w).toBeLessThanOrEqual(4 + 1e-9);
    }
  });

  it("gives every bottle positive dimensions even when cramped", () => {
    const l = layoutBottles(14, 4, 200, 200);
    for (const b of l.bottles) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
    }
  });

  it("centres each row horizontally", () => {
    const l = layoutBottles(5, 4, W, H);
    const first = l.bottles[0];
    const last = l.bottles[4];
    expect(first.x).toBeCloseTo(W - (last.x + last.w));
  });
});

describe("hitTest", () => {
  const centreOf = (l: Layout, i: number) => ({
    x: l.bottles[i].x + l.bottles[i].w / 2,
    y: l.bottles[i].y + l.bottles[i].h / 2,
  });

  it("round-trips the centre of every bottle", () => {
    for (const count of COUNTS) {
      const l = layoutBottles(count, 4, W, H);
      for (let i = 0; i < l.bottles.length; i++) {
        const c = centreOf(l, i);
        expect(hitTest(l, c.x, c.y)).toBe(i);
      }
    }
  });

  it("returns null well outside every bottle", () => {
    const l = layoutBottles(4, 4, W, H);
    expect(hitTest(l, -100, -100)).toBeNull();
    expect(hitTest(l, W + 100, H + 100)).toBeNull();
  });
});
