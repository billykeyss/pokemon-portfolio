import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { deal, generate, shuffled } from "./generate";
import { MAX_TYPES } from "./items";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { applyMove, cloneBoard, isSolved, remaining, resolveMatches } from "./rules";
import { solve } from "./solve";
import { SHELF_WIDTH, type Board, type LevelParams } from "./types";

const params: LevelParams = { types: 5, shelves: 6, freeSlots: 3 };

/** Every type must appear exactly SHELF_WIDTH times or the board cannot clear. */
function expectBalanced(board: Board) {
  const counts = new Map<number, number>();
  for (const shelf of board.shelves) {
    for (const slot of shelf) {
      for (const item of slot) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  for (const n of counts.values()) expect(n).toBe(SHELF_WIDTH);
}

describe("shuffled", () => {
  it("preserves the multiset", () => {
    const input = [0, 0, 1, 1, 2];
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
  it("builds the requested number of shelves, three slots each", () => {
    const b = deal(params, makeRng(2));
    expect(b.shelves).toHaveLength(params.shelves);
    for (const shelf of b.shelves) expect(shelf).toHaveLength(SHELF_WIDTH);
  });

  it("gives every type exactly three copies", () => {
    expectBalanced(deal(params, makeRng(2)));
  });

  it("leaves slots free, since nothing could move otherwise", () => {
    const b = deal(params, makeRng(6));
    const empty = b.shelves.flat().filter((s) => s.length === 0).length;
    expect(empty).toBeGreaterThanOrEqual(params.freeSlots);
  });

  it("caps types at the available artwork", () => {
    const wide = deal({ ...params, types: 99, shelves: 40 }, makeRng(1));
    expect(wide.types).toBeLessThanOrEqual(MAX_TYPES);
  });

  it("spreads depth rather than burying one slot under a pile", () => {
    const tight: LevelParams = { types: 8, shelves: 6, freeSlots: 3 };
    const b = deal(tight, makeRng(9));
    const deepest = Math.max(...b.shelves.flat().map((s) => s.length));
    expect(deepest).toBeLessThanOrEqual(2);
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

  it("never deals a board that clears itself on sight", () => {
    for (let seed = 0; seed < 10; seed++) {
      const probe = cloneBoard(generate(params, seed));
      expect(resolveMatches(probe)).toBe(0);
    }
  });
});

describe("paramsForLevel", () => {
  it("starts with more shelves than types, so nothing is buried", () => {
    const p = paramsForLevel(1);
    expect(p).toEqual({ types: 6, shelves: 7, freeSlots: 3 });
    // 21 slots for 18 items: every item gets its own slot.
    expect(p.shelves * SHELF_WIDTH).toBeGreaterThan(p.types * SHELF_WIDTH);
  });

  it("opens on a full wall rather than a handful of shelves", () => {
    // A sparse opening board reads as an unfinished game, not an easy one.
    expect(paramsForLevel(1).shelves).toBeGreaterThanOrEqual(7);
  });

  it("adds a kind of goods every four levels", () => {
    expect(paramsForLevel(5).types).toBe(7);
    expect(paramsForLevel(9).types).toBe(8);
  });

  it("lets shelves fall behind the type count, which is what buries items", () => {
    expect(paramsForLevel(30).shelves).toBeLessThan(paramsForLevel(30).types);
  });

  it("caps at the available artwork", () => {
    expect(paramsForLevel(500).types).toBeLessThanOrEqual(MAX_TYPES);
  });

  it("always keeps three free slots", () => {
    for (const n of [1, 10, 30, 100]) expect(paramsForLevel(n).freeSlots).toBe(3);
  });

  it("always leaves room for every item plus the free slots", () => {
    for (let n = 1; n <= 60; n++) {
      const p = paramsForLevel(n);
      // Depth is allowed, but never so tight that the deal cannot be laid out.
      const inPlay = p.shelves * SHELF_WIDTH - p.freeSlots;
      expect(inPlay).toBeGreaterThan(0);
      expect(p.types * SHELF_WIDTH).toBeLessThanOrEqual(inPlay * 2);
    }
  });

  it("never loses ground as the level climbs", () => {
    let types = 0;
    for (let n = 1; n <= 60; n++) {
      const p = paramsForLevel(n);
      expect(p.types).toBeGreaterThanOrEqual(types);
      types = p.types;
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
      const board = levelFor(level);
      expectBalanced(board);
      expect(remaining(board)).toBe(board.types * SHELF_WIDTH);

      const result = solve(board);
      expect(result.status).toBe("solved");
      if (result.status !== "solved") continue;

      // The solution must survive being replayed through the real rules.
      let state = board;
      for (const move of result.moves) state = applyMove(state, move);
      expect(isSolved(state)).toBe(true);
    }
  }, 120_000);
});
