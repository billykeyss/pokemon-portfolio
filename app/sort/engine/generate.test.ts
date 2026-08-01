import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { deal, generate, isTrivial, shuffled, shuffleFromSolved } from "./generate";
import { isComplete } from "./rules";
import { solve } from "./solve";
import type { LevelParams } from "./types";

const params: LevelParams = { colors: 4, capacity: 4, bottles: 8, empty: 2 };

describe("shuffled", () => {
  it("preserves the multiset", () => {
    const input = [0, 0, 1, 1, 2, 2];
    const out = shuffled(input, makeRng(7));
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("is deterministic for a given seed", () => {
    expect(shuffled([1, 2, 3, 4, 5], makeRng(9))).toEqual(
      shuffled([1, 2, 3, 4, 5], makeRng(9)),
    );
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3];
    shuffled(input, makeRng(1));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("deal", () => {
  it("lays out the full width of the board", () => {
    const p = deal(params, makeRng(3));
    expect(p.bottles).toHaveLength(params.bottles);
  });

  it("always leaves at least the guaranteed empties", () => {
    for (let seed = 0; seed < 12; seed++) {
      const p = deal(params, makeRng(seed));
      expect(p.bottles.filter((b) => b.length === 0).length).toBeGreaterThanOrEqual(
        params.empty,
      );
    }
  });

  it("starts bottles at varying depths, not just full or empty", () => {
    // The whole point of dealing across more bottles than there are colours:
    // otherwise every board opens looking identical.
    const depths = new Set<number>();
    for (let seed = 0; seed < 12; seed++) {
      for (const b of deal(params, makeRng(seed)).bottles) depths.add(b.length);
    }
    expect(depths.has(0)).toBe(true);
    expect([...depths].some((d) => d > 0 && d < params.capacity)).toBe(true);
  });

  it("never overfills a bottle", () => {
    for (let seed = 0; seed < 12; seed++) {
      const p = deal(params, makeRng(seed));
      expect(p.bottles.every((b) => b.length <= params.capacity)).toBe(true);
    }
  });

  it("gives every colour exactly `capacity` units", () => {
    const p = deal(params, makeRng(11));
    const counts = new Map<number, number>();
    for (const b of p.bottles) {
      for (const c of b) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual(Array(params.colors).fill(params.capacity));
  });
});

describe("isTrivial", () => {
  it("flags a deal containing an already-finished bottle", () => {
    expect(
      isTrivial({
        bottles: [
          [0, 0, 0, 0],
          [1, 1, 0, 1],
        ],
        capacity: 4,
        colors: 2,
      }),
    ).toBe(true);
  });

  it("accepts a properly mixed deal", () => {
    expect(
      isTrivial({
        bottles: [
          [0, 1, 0, 1],
          [1, 0, 1, 0],
        ],
        capacity: 4,
        colors: 2,
      }),
    ).toBe(false);
  });
});

describe("shuffleFromSolved", () => {
  // This is the fallback's whole reason for existing, so it is asserted
  // directly rather than trusted. An earlier version moved single units without
  // matching colours and silently produced unsolvable levels.
  it("is solvable by construction across a range of shapes", () => {
    for (const shape of [
      { colors: 3, capacity: 4, bottles: 7, empty: 2 },
      { colors: 6, capacity: 4, bottles: 10, empty: 2 },
      { colors: 10, capacity: 4, bottles: 14, empty: 2 },
      { colors: 12, capacity: 4, bottles: 16, empty: 2 },
    ]) {
      for (let seed = 0; seed < 6; seed++) {
        const p = shuffleFromSolved(shape, makeRng(seed));
        expect(solve(p).status).toBe("solved");
      }
    }
  }, 60_000);

  it("conserves every colour's unit count", () => {
    const p = shuffleFromSolved({ colors: 5, capacity: 4, bottles: 9, empty: 2 }, makeRng(2));
    const counts = new Map<number, number>();
    for (const b of p.bottles) {
      for (const c of b) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual(Array(5).fill(4));
  });

  it("never overfills a bottle", () => {
    const p = shuffleFromSolved({ colors: 8, capacity: 4, bottles: 11, empty: 2 }, makeRng(4));
    expect(p.bottles.every((b) => b.length <= 4)).toBe(true);
  });
});

describe("generate", () => {
  it("is deterministic for a given seed", () => {
    expect(generate(params, 42)).toEqual(generate(params, 42));
  });

  it("produces a solvable puzzle", () => {
    expect(solve(generate(params, 42)).status).toBe("solved");
  });

  it("never starts with a completed bottle", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = generate(params, seed);
      expect(p.bottles.some((b) => isComplete(b, p.capacity))).toBe(false);
    }
  });

  it("different seeds give different puzzles", () => {
    expect(generate(params, 1)).not.toEqual(generate(params, 2));
  });

  it("conserves the colour multiset at twelve colours", () => {
    const wide: LevelParams = { colors: 12, capacity: 4, bottles: 16, empty: 2 };
    const p = generate(wide, 5);
    const counts = new Map<number, number>();
    for (const b of p.bottles) {
      for (const c of b) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect(counts.size).toBe(12);
    expect([...counts.values()].every((n) => n === 4)).toBe(true);
  });
});
