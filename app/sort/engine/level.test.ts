import { describe, expect, it } from "vitest";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { PALETTE } from "./palette";
import { isComplete } from "./rules";
import { solve } from "./solve";

describe("paramsForLevel", () => {
  it("starts at seven bottles", () => {
    expect(paramsForLevel(1)).toEqual({ colors: 5, free: 2, capacity: 4 });
  });

  it("adds a colour every two levels", () => {
    expect(paramsForLevel(3).colors).toBe(6);
    expect(paramsForLevel(5).colors).toBe(7);
  });

  it("caps at sixteen colours, which is eighteen bottles", () => {
    expect(paramsForLevel(23).colors).toBe(16);
    expect(paramsForLevel(500).colors).toBe(16);
    expect(paramsForLevel(500).colors + paramsForLevel(500).free).toBe(18);
  });

  it("never drops below five colours for zero or negative input", () => {
    expect(paramsForLevel(0).colors).toBe(5);
    expect(paramsForLevel(-5).colors).toBe(5);
  });

  it("always leaves two spare bottles", () => {
    for (const n of [1, 10, 30, 40, 100]) {
      expect(paramsForLevel(n).free).toBe(2);
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
    const p = levelFor(12);
    const params = paramsForLevel(12);
    expect(p.bottles).toHaveLength(params.colors + params.free);
  });

  it("produces solvable, non-trivial puzzles across the curve", () => {
    for (let level = 1; level <= 60; level++) {
      const p = levelFor(level);
      expect(p.bottles.some((b) => isComplete(b, p.capacity))).toBe(false);
      expect(solve(p).status).toBe("solved");
    }
  }, 120_000);
});
