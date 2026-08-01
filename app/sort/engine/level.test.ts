import { describe, expect, it } from "vitest";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { PALETTE } from "./palette";
import { isComplete } from "./rules";
import { solve } from "./solve";

describe("paramsForLevel", () => {
  it("starts at nine bottles for five colours", () => {
    expect(paramsForLevel(1)).toEqual({
      colors: 5,
      capacity: 4,
      bottles: 9,
      empty: 2,
    });
  });

  it("adds a colour every two levels", () => {
    expect(paramsForLevel(3).colors).toBe(6);
    expect(paramsForLevel(5).colors).toBe(7);
  });

  it("caps at sixteen colours, which is twenty bottles", () => {
    expect(paramsForLevel(23).colors).toBe(16);
    expect(paramsForLevel(500).colors).toBe(16);
    expect(paramsForLevel(500).bottles).toBe(20);
  });

  it("never drops below five colours for zero or negative input", () => {
    expect(paramsForLevel(0).colors).toBe(5);
    expect(paramsForLevel(-5).colors).toBe(5);
  });

  it("always keeps two bottles empty", () => {
    for (const n of [1, 10, 30, 40, 100]) {
      expect(paramsForLevel(n).empty).toBe(2);
    }
  });

  it("always runs wider than the colour count, so depths can vary", () => {
    for (let n = 1; n <= 60; n++) {
      const p = paramsForLevel(n);
      expect(p.bottles - p.empty).toBeGreaterThan(p.colors);
    }
  });

  it("never asks for more colours than there is paint", () => {
    expect(paramsForLevel(999).colors).toBeLessThanOrEqual(PALETTE.length);
  });

  it("never loses ground as the level climbs", () => {
    let previous = 0;
    for (let n = 1; n <= 100; n++) {
      const { colors } = paramsForLevel(n);
      expect(colors).toBeGreaterThanOrEqual(previous);
      previous = colors;
    }
  });
});

describe("seedForLevel", () => {
  it("is stable", () => {
    expect(seedForLevel(7)).toBe(seedForLevel(7));
  });

  it("differs between adjacent levels", () => {
    expect(seedForLevel(7)).not.toBe(seedForLevel(8));
  });

  it("stays a non-negative 32-bit integer", () => {
    for (let n = 1; n <= 50; n++) {
      const seed = seedForLevel(n);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("levelFor", () => {
  it("returns the identical puzzle every call", () => {
    expect(levelFor(3)).toEqual(levelFor(3));
  });

  it("has the right bottle count for its params", () => {
    expect(levelFor(12).bottles).toHaveLength(paramsForLevel(12).bottles);
  });

  it("produces solvable, non-trivial puzzles across the curve", () => {
    for (let level = 1; level <= 60; level++) {
      const p = levelFor(level);
      expect(p.bottles.some((b) => isComplete(b, p.capacity))).toBe(false);
      expect(solve(p).status).toBe("solved");
    }
  }, 120_000);
});
