import { describe, it, expect } from "vitest";
import { createWorld, spawnEnemy } from "./world";
import { autoAim, aimFromDrag, predictPath, LAUNCH_SPEED } from "./aim";
import { len } from "./vec";

const arena = { width: 400, height: 700 };
const origin = { x: 200, y: 660 };

describe("autoAim", () => {
  it("returns a unit vector", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 300, y: 200 }, 10, 14);
    expect(len(autoAim(w, origin))).toBeCloseTo(1);
  });

  it("aims upward when there are no enemies", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(autoAim(w, origin).y).toBeLessThan(0);
  });

  it("aims toward the lowest (most threatening) enemy", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 60, y: 100 }, 10, 14);
    spawnEnemy(w, { x: 340, y: 500 }, 10, 14);
    expect(autoAim(w, origin).x).toBeGreaterThan(0);
  });

  it("always aims upward even if an enemy is below the launcher", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 200, y: 695 }, 10, 14);
    expect(autoAim(w, origin).y).toBeLessThan(0);
  });

  it("ignores settled critters when choosing a target", () => {
    const w = createWorld({ arena, seed: 1 });
    const e = spawnEnemy(w, { x: 60, y: 300 }, 10, 14);
    e.kind = "settled";
    expect(autoAim(w, origin).x).toBeCloseTo(0, 1);
  });
});

describe("aimFromDrag", () => {
  it("returns a unit vector pointing from origin toward the touch", () => {
    const d = aimFromDrag(origin, { x: 200, y: 400 });
    expect(len(d)).toBeCloseTo(1);
    expect(d.y).toBeLessThan(0);
  });

  it("clamps a downward drag to horizontal-ish rather than firing into the floor", () => {
    expect(aimFromDrag(origin, { x: 300, y: 690 }).y).toBeLessThanOrEqual(0);
  });

  it("falls back to straight up when the touch is on the origin", () => {
    expect(aimFromDrag(origin, { ...origin })).toEqual({ x: 0, y: -1 });
  });
});

describe("predictPath", () => {
  it("returns the requested number of points", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(predictPath(w, origin, { x: 0, y: -1 }, 1, 12)).toHaveLength(12);
  });

  it("starts near the origin and moves upward", () => {
    const w = createWorld({ arena, seed: 1 });
    const path = predictPath(w, origin, { x: 0, y: -1 }, 1, 12);
    expect(path[0].y).toBeLessThan(origin.y);
    expect(path[11].y).toBeLessThan(path[0].y);
  });

  it("reflects off a side wall", () => {
    const w = createWorld({ arena, seed: 1 });
    const path = predictPath(w, origin, { x: -0.8, y: -0.6 }, 1.6, 60);
    for (const p of path) expect(p.x).toBeGreaterThanOrEqual(0);
    const turned = path.some((p, i) => i > 0 && p.x > path[i - 1].x);
    expect(turned).toBe(true);
  });

  it("does not mutate the world", () => {
    const w = createWorld({ arena, seed: 1 });
    const before = JSON.stringify(w);
    predictPath(w, origin, { x: 0.3, y: -0.9 }, 1, 30);
    expect(JSON.stringify(w)).toEqual(before);
  });

  it("uses a sane launch speed", () => {
    expect(LAUNCH_SPEED).toBeGreaterThan(100);
  });
});
