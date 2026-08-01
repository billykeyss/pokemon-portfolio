import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { deal, generate, shuffled } from "./generate";
import { MAX_TYPES } from "./items";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { applyMove, isSolved } from "./rules";
import { solve } from "./solve";
import { MATCH, type LevelParams, type Shelf } from "./types";

const params: LevelParams = { types: 5, columns: 4, depth: 0, traySize: 7 };

/** Every type must appear exactly MATCH times, or the board cannot be cleared. */
function expectBalanced(shelf: Shelf) {
  const counts = new Map<number, number>();
  for (const column of shelf.columns) {
    for (const type of column) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  for (const n of counts.values()) expect(n).toBe(MATCH);
}

describe("shuffled", () => {
  it("preserves the multiset", () => {
    const input = [0, 0, 1, 1, 2, 2];
    expect([...shuffled(input, makeRng(4))].sort()).toEqual([...input].sort());
  });

  it("is deterministic for a seed", () => {
    expect(shuffled([1, 2, 3, 4], makeRng(3))).toEqual(shuffled([1, 2, 3, 4], makeRng(3)));
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3];
    shuffled(input, makeRng(1));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("deal", () => {
  it("creates the requested number of columns", () => {
    expect(deal(params, makeRng(2)).columns).toHaveLength(params.columns);
  });

  it("gives every type exactly three copies", () => {
    expectBalanced(deal(params, makeRng(2)));
  });

  it("leaves no column empty", () => {
    const shelf = deal(params, makeRng(6));
    expect(shelf.columns.every((c) => c.length > 0)).toBe(true);
  });

  it("starts with an empty tray", () => {
    expect(deal(params, makeRng(2)).tray).toEqual([]);
  });

  it("caps types at the available artwork", () => {
    const wide = deal({ ...params, types: 99 }, makeRng(1));
    expect(wide.types).toBeLessThanOrEqual(MAX_TYPES);
  });
});

describe("generate", () => {
  it("is deterministic for a seed", () => {
    expect(generate(params, 12)).toEqual(generate(params, 12));
  });

  it("differs between seeds", () => {
    expect(generate(params, 1)).not.toEqual(generate(params, 2));
  });

  it("stays balanced", () => {
    expectBalanced(generate(params, 7));
  });

  it("produces a clearable board", () => {
    for (let seed = 0; seed < 10; seed++) {
      expect(solve(generate(params, seed)).status).toBe("solved");
    }
  });

  it("never opens with a set already showing", () => {
    for (let seed = 0; seed < 10; seed++) {
      const shelf = generate(params, seed);
      const fronts = shelf.columns.map((c) => c[c.length - 1]);
      const counts = new Map<number, number>();
      for (const type of fronts) counts.set(type, (counts.get(type) ?? 0) + 1);
      expect([...counts.values()].every((n) => n < MATCH)).toBe(true);
    }
  });
});

describe("paramsForLevel", () => {
  it("starts small and forgiving", () => {
    expect(paramsForLevel(1)).toEqual({
      types: 3,
      columns: 3,
      depth: 0,
      traySize: 7,
    });
  });

  it("adds goods and shelves as levels climb", () => {
    expect(paramsForLevel(30).types).toBeGreaterThan(paramsForLevel(1).types);
    expect(paramsForLevel(30).columns).toBeGreaterThan(paramsForLevel(1).columns);
  });

  it("tightens the tray, but never past five", () => {
    expect(paramsForLevel(1).traySize).toBe(7);
    expect(paramsForLevel(20).traySize).toBe(5);
    expect(paramsForLevel(500).traySize).toBe(5);
  });

  it("caps at the available artwork", () => {
    expect(paramsForLevel(500).types).toBeLessThanOrEqual(MAX_TYPES);
    expect(paramsForLevel(500).columns).toBeLessThanOrEqual(6);
  });

  it("never loses ground as the level climbs", () => {
    let types = 0;
    let columns = 0;
    let tray = 99;
    for (let n = 1; n <= 60; n++) {
      const p = paramsForLevel(n);
      expect(p.types).toBeGreaterThanOrEqual(types);
      expect(p.columns).toBeGreaterThanOrEqual(columns);
      expect(p.traySize).toBeLessThanOrEqual(tray);
      types = p.types;
      columns = p.columns;
      tray = p.traySize;
    }
  });

  it("clamps zero and negative input to level one", () => {
    expect(paramsForLevel(0)).toEqual(paramsForLevel(1));
    expect(paramsForLevel(-9)).toEqual(paramsForLevel(1));
  });
});

describe("seedForLevel", () => {
  it("is stable and level-specific", () => {
    expect(seedForLevel(5)).toBe(seedForLevel(5));
    expect(seedForLevel(5)).not.toBe(seedForLevel(6));
  });

  it("stays a non-negative 32-bit integer", () => {
    for (let n = 1; n <= 40; n++) {
      const seed = seedForLevel(n);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("levelFor", () => {
  it("returns the identical board every call", () => {
    expect(levelFor(3)).toEqual(levelFor(3));
  });

  it("produces balanced, clearable boards across the curve", () => {
    for (let level = 1; level <= 30; level++) {
      const shelf = levelFor(level);
      expectBalanced(shelf);

      const result = solve(shelf);
      expect(result.status).toBe("solved");
      if (result.status !== "solved") continue;

      // The solution must survive being replayed through the real rules.
      let state = shelf;
      for (const move of result.moves) state = applyMove(state, move);
      expect(isSolved(state)).toBe(true);
    }
  }, 120_000);
});
