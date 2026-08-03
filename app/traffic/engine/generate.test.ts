import { describe, expect, it } from "vitest";
import { generate } from "./generate";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { cellsOf, fitsOnBoard, isSolved, overlaps } from "./rules";
import { parFor, solve } from "./solve";
import { PLAYER_ID, type Board } from "./types";
import { applyMove } from "./rules";

const params = { size: 6, vehicles: 6, minMoves: 4 };

/** Every structural invariant a board must satisfy to be playable. */
function expectWellFormed(board: Board) {
  const player = board.vehicles.find((v) => v.id === PLAYER_ID);
  expect(player).toBeDefined();
  expect(player?.horizontal).toBe(true);
  expect(player?.row).toBe(board.exitRow);

  for (const v of board.vehicles) {
    expect(fitsOnBoard(board, v)).toBe(true);
    for (const cell of cellsOf(v)) {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(board.size);
      expect(cell.col).toBeLessThan(board.size);
    }
  }

  for (let i = 0; i < board.vehicles.length; i++) {
    for (let j = i + 1; j < board.vehicles.length; j++) {
      expect(overlaps(board.vehicles[i], board.vehicles[j])).toBe(false);
    }
  }
}

describe("generate", () => {
  it("is deterministic for a given seed", () => {
    expect(generate(params, 11)).toEqual(generate(params, 11));
  });

  it("produces different boards for different seeds", () => {
    expect(generate(params, 1)).not.toEqual(generate(params, 2));
  });

  it("produces a well-formed board", () => {
    expectWellFormed(generate(params, 5));
  });

  it("never hands over a board that is already solved", () => {
    for (let seed = 0; seed < 12; seed++) {
      expect(isSolved(generate(params, seed))).toBe(false);
    }
  });

  it("never puts another horizontal vehicle on the exit row", () => {
    // Such a vehicle could never clear the player's path, so the board would be
    // unsolvable by construction.
    for (let seed = 0; seed < 12; seed++) {
      const board = generate(params, seed);
      const blockers = board.vehicles.filter(
        (v) => v.id !== PLAYER_ID && v.horizontal && v.row === board.exitRow,
      );
      expect(blockers).toHaveLength(0);
    }
  });

  it("always produces a solvable board", () => {
    for (let seed = 0; seed < 12; seed++) {
      expect(solve(generate(params, seed)).status).toBe("solved");
    }
  });

  it("never produces a one-move board", () => {
    for (let seed = 0; seed < 12; seed++) {
      expect(parFor(generate(params, seed)) ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("paramsForLevel", () => {
  it("starts small", () => {
    expect(paramsForLevel(1)).toMatchObject({ size: 6, vehicles: 4, minMoves: 3 });
  });

  it("reaches a full board by level thirteen", () => {
    // Density is the dial that works, so the ramp spends most of its length
    // getting there rather than easing toward it.
    expect(paramsForLevel(12).vehicles).toBeLessThan(12);
    expect(paramsForLevel(13).vehicles).toBe(12);
  });

  it("bounds the search budget by the one wait a player can see", () => {
    // Generation is in a worker, so the budget no longer trades against a
    // freeze. What bounds it is jumping to an unbuilt level from level select,
    // which is the only case where the build is not hidden behind play.
    for (const n of [1, 20, 500]) {
      expect(paramsForLevel(n).attempts ?? 0).toBeLessThanOrEqual(30);
      expect(paramsForLevel(n).attempts ?? 0).toBeGreaterThan(0);
    }
  });

  it("spends less on early levels, which are not prefetched yet", () => {
    expect(paramsForLevel(1).attempts ?? 0).toBeLessThan(
      paramsForLevel(30).attempts ?? 0,
    );
  });

  it("keeps generating past the point the dials stop moving", () => {
    // Infinite in the sense that matters: level 500 is a real board, not a
    // repeat of the last one the curve had parameters for.
    const far = levelFor(500);
    expect(far.vehicles).toHaveLength(paramsForLevel(500).vehicles);
    expect(solve(far).status).toBe("solved");
    expect(levelFor(500)).not.toEqual(levelFor(501));
  }, 30_000);

  it("adds vehicles and depth as levels climb", () => {
    expect(paramsForLevel(20).vehicles).toBeGreaterThan(paramsForLevel(1).vehicles);
    expect(paramsForLevel(20).minMoves).toBeGreaterThan(paramsForLevel(1).minMoves);
  });

  it("caps the vehicle count where a 6x6 can still place them", () => {
    // Fourteen fails to place on thirty-six cells; thirteen is measurably worse
    // than twelve. This is a measured ceiling, not a chosen one.
    expect(paramsForLevel(500).vehicles).toBeLessThanOrEqual(12);
  });

  it("never loses ground as the level climbs", () => {
    let vehicles = 0;
    let moves = 0;
    for (let n = 1; n <= 60; n++) {
      const p = paramsForLevel(n);
      expect(p.vehicles).toBeGreaterThanOrEqual(vehicles);
      expect(p.minMoves).toBeGreaterThanOrEqual(moves);
      vehicles = p.vehicles;
      moves = p.minMoves;
    }
  });

  it("clamps zero and negative input to level one", () => {
    expect(paramsForLevel(0)).toEqual(paramsForLevel(1));
    expect(paramsForLevel(-4)).toEqual(paramsForLevel(1));
  });
});

describe("seedForLevel", () => {
  it("is stable", () => {
    expect(seedForLevel(9)).toBe(seedForLevel(9));
  });

  it("differs between adjacent levels", () => {
    expect(seedForLevel(9)).not.toBe(seedForLevel(10));
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
    expect(levelFor(4)).toEqual(levelFor(4));
  });

  it("produces solvable, well-formed, non-trivial boards across the curve", () => {
    for (let level = 1; level <= 24; level++) {
      const board = levelFor(level);
      expectWellFormed(board);

      const result = solve(board);
      expect(result.status).toBe("solved");
      if (result.status !== "solved") continue;

      expect(result.moves.length).toBeGreaterThanOrEqual(2);

      // The par must actually be walkable through the real move rules.
      let state = board;
      for (const move of result.moves) state = applyMove(state, move);
      expect(isSolved(state)).toBe(true);
    }
  }, 120_000);
});
