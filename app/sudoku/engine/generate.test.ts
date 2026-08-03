import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { carve, fullGrid, puzzleFor } from "./generate";
import { gradeGrid, hardestRank } from "./grade";
import { countSolutions, isValidGrid } from "./solve";
import { TIERS, type Tier } from "./types";

describe("carve", () => {
  // A fixed solution and rng seed, reused across cases below, so pressure is
  // the only thing changing between calls — otherwise a shift in given-count
  // could come from a different shuffle order instead of the pressure math.
  const solution = fullGrid(makeRng(11));

  it("lowers the target by exactly the pressure amount, before the floor clamps it", () => {
    const counts = [0, 4, 8, 12].map(
      (pressure) => carve(solution, makeRng(55), "easy", pressure).filter((c) => c !== 0).length,
    );
    // TARGET_GIVENS.easy is 38: each +4 of pressure should carve 4 further,
    // exactly, until the floor gets involved.
    expect(counts).toEqual([38, 34, 30, 26]);
  });

  // fullGrid(makeRng(3)) carved with makeRng(74), with no target at all
  // (every removable cell tried, in this shuffle order, with nothing but
  // uniqueness stopping it) bottoms out at 20 givens — two below MIN_GIVENS.
  // That makes it the right fixture for proving the floor itself is what
  // stops carving, rather than this board simply running out of removable
  // cells above 22: if either test below lands anywhere but exactly 22, the
  // floor isn't the thing that stopped it.
  const floorBindingSolution = fullGrid(makeRng(3));

  it("stops lowering the target once pressure would push it past MIN_GIVENS (22)", () => {
    // TARGET_GIVENS.easy - 16 computes to exactly 22, the mandated floor, so
    // pressure 16 and pressure 999_999 ask carve() for the identical target
    // — and since this fixture's own uniqueness constraint would otherwise
    // permit carving to 20, landing at 22 for both proves the clamp, not
    // uniqueness, is what stopped them.
    const atFloor = carve(floorBindingSolution, makeRng(74), "easy", 16).filter(
      (c) => c !== 0,
    ).length;
    const wayPastFloor = carve(floorBindingSolution, makeRng(74), "easy", 999_999).filter(
      (c) => c !== 0,
    ).length;
    expect(atFloor).toBe(22);
    expect(wayPastFloor).toBe(22);
  });

  it("never removes past MIN_GIVENS (22), even at absurd pressure, for every tier", () => {
    // Same fixture: uniqueness alone would allow carving to 20 here, so
    // landing at exactly 22 for every tier demonstrates the clamp is what
    // binds, not this board happening to run out of removable cells early.
    // Tier stops mattering once pressure has clamped all four to the same
    // target.
    for (const tier of TIERS) {
      const count = carve(floorBindingSolution, makeRng(74), tier, 1_000_000).filter(
        (c) => c !== 0,
      ).length;
      expect(count).toBe(22);
    }
  });

  it("can reach MIN_GIVENS (22) exactly when the board allows it", () => {
    // Reachability, not clamping: this fixture's own uniqueness barrier stops
    // at 22 too, so deleting the Math.max clamp leaves this passing. What it
    // catches is a target formula that stops short of the floor. The two tests
    // above are the ones that bind on the clamp itself.
    const fixedSolution = fullGrid(makeRng(1));
    const count = carve(fixedSolution, makeRng(14), "expert", 1_000_000).filter(
      (c) => c !== 0,
    ).length;
    expect(count).toBe(22);
  });

  it("keeps every removal valid: a high-pressure carve still has exactly one solution", () => {
    const fixedSolution = fullGrid(makeRng(1));
    const grid = carve(fixedSolution, makeRng(14), "expert", 1_000_000);
    expect(countSolutions(grid, 2)).toBe(1);
  });

  it("is deterministic for the same solution, seed, tier, and pressure", () => {
    const a = carve(solution, makeRng(77), "medium", 5);
    const b = carve(solution, makeRng(77), "medium", 5);
    expect(a).toEqual(b);
  });
});

describe("fullGrid", () => {
  it("produces a valid complete grid", () => {
    expect(isValidGrid(fullGrid(makeRng(1)))).toBe(true);
  });

  it("is deterministic for a seed", () => {
    expect(fullGrid(makeRng(7))).toEqual(fullGrid(makeRng(7)));
  });

  it("produces different grids for different seeds", () => {
    expect(fullGrid(makeRng(1))).not.toEqual(fullGrid(makeRng(2)));
  });
});

describe("puzzleFor", () => {
  it("returns a puzzle whose givens are a subset of its solution", () => {
    const p = puzzleFor("easy", 3);
    expect(isValidGrid(p.solution)).toBe(true);
    for (let i = 0; i < 81; i++) {
      if (p.givens[i] !== 0) expect(p.givens[i]).toBe(p.solution[i]);
    }
  });

  it("has exactly one solution", () => {
    for (const tier of TIERS) {
      expect(countSolutions(puzzleFor(tier, 11).givens, 2)).toBe(1);
    }
  });

  it("is reproducible from its seed", () => {
    expect(puzzleFor("medium", 42)).toEqual(puzzleFor("medium", 42));
  });

  it("records the tier it was actually graded at", () => {
    for (const tier of TIERS) {
      const p = puzzleFor(tier, 5);
      expect(p.tier).toBe(gradeGrid(p.givens));
    }
  });

  it("leaves enough givens to be a puzzle rather than a blank", () => {
    for (const tier of TIERS) {
      const count = puzzleFor(tier, 9).givens.filter((c) => c !== 0).length;
      expect(count).toBeGreaterThanOrEqual(17);
      expect(count).toBeLessThan(60);
    }
  });

  it("never deals a board with no deduction in it", () => {
    // Rank 0 means naked singles alone finish it, and this game draws those
    // for the player — such a board is solved by tapping, not thinking. The
    // spec puts hidden singles at Easy's floor, so no tier may serve one.
    for (const tier of TIERS) {
      for (const seed of [1, 2, 3, 4, 5]) {
        expect(hardestRank(puzzleFor(tier, seed).givens)).toBeGreaterThanOrEqual(1);
      }
    }
  }, 30_000);

  it("hits the tier it was asked for, most of the time", () => {
    // Not all of the time: the generator gives up after MAX_ATTEMPTS and
    // returns its closest result rather than blocking the player.
    const asked: Tier = "medium";
    const hits = [1, 2, 3, 4, 5, 6].filter((s) => puzzleFor(asked, s).tier === asked);
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });

  it("stays inside a budget a player will not notice", () => {
    // Traffic Jam's generator once took 8.5s per level. Measure, do not assume.
    //
    // Several seeds, not one. This assertion used to sample seed 21 alone, and
    // seed 21 is the cheapest expert board in a twelve-seed sweep — 307ms
    // against an 801ms average and a 1189ms worst case. A tripwire strung
    // across the easiest case is not a tripwire. Seed 37 is the expensive end
    // of that sweep and is here deliberately.
    for (const tier of TIERS) {
      for (const seed of [11, 21, 37, 47]) {
        const started = performance.now();
        puzzleFor(tier, seed);
        const ms = performance.now() - started;
        expect(ms).toBeLessThan(3000);
      }
    }
  }, 60_000);
});
