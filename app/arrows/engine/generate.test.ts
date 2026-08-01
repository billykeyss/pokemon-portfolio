import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { MIN_LENGTH, generate, scatter, shuffled } from "./generate";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { applyMove, isSolved } from "./rules";
import { freeRatio, isSolvable, trace } from "./solve";
import { DIRS as DIRS_FOR_TEST, DIR_COUNT, headOf, type Board, type LevelParams } from "./types";

const params: LevelParams = { size: 9, maxLength: 4, fillTarget: 0.6, maxFreeRatio: 0.6 };

/** Structural invariants every board must satisfy to be playable. */
function expectWellFormed(board: Board) {
  const seen = new Set<string>();
  const ids = new Set<number>();

  for (const a of board.arrows) {
    expect(a.cells.length).toBeGreaterThan(0);
    expect(a.dir).toBeGreaterThanOrEqual(0);
    expect(a.dir).toBeLessThan(DIR_COUNT);

    expect(ids.has(a.id)).toBe(false);
    ids.add(a.id);

    for (let i = 0; i < a.cells.length; i++) {
      const c = a.cells[i];
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(board.size);
      expect(c.col).toBeLessThan(board.size);

      // No two arrows may share a cell, and no track may cross itself.
      const key = `${c.row},${c.col}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);

      // Consecutive cells must be orthogonally adjacent, or the track is not a
      // route the body could actually slide along.
      if (i > 0) {
        const prev = a.cells[i - 1];
        expect(Math.abs(c.row - prev.row) + Math.abs(c.col - prev.col)).toBe(1);
      }
    }
  }
}

describe("shuffled", () => {
  it("preserves the multiset", () => {
    const input = [1, 2, 3, 4, 5];
    expect([...shuffled(input, makeRng(3))].sort()).toEqual([...input].sort());
  });

  it("is deterministic for a seed", () => {
    expect(shuffled([1, 2, 3, 4], makeRng(8))).toEqual(shuffled([1, 2, 3, 4], makeRng(8)));
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3];
    shuffled(input, makeRng(1));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("scatter", () => {
  it("packs the board to roughly the fill it was asked for", () => {
    const board = scatter(params, makeRng(2));
    const covered = board.arrows.reduce((n, a) => n + a.cells.length, 0);
    const cells = params.size * params.size;
    expect(covered / cells).toBeGreaterThanOrEqual(params.fillTarget - 0.12);
    expect(covered / cells).toBeLessThanOrEqual(params.fillTarget + 0.12);
  });

  it("never stacks two arrows on one cell", () => {
    expectWellFormed(scatter(params, makeRng(5)));
  });

  it("cannot cover more cells than the board has", () => {
    const tiny = scatter({ size: 2, maxLength: 3, fillTarget: 1, maxFreeRatio: 1 }, makeRng(1));
    const covered = tiny.arrows.reduce((n, a) => n + a.cells.length, 0);
    expect(covered).toBeLessThanOrEqual(4);
    expectWellFormed(tiny);
  });

  it("grows tracks longer than one cell", () => {
    const board = scatter(params, makeRng(9));
    expect(board.arrows.some((a) => a.cells.length > 1)).toBe(true);
  });

  it("never grows a track past its length cap", () => {
    const board = scatter(params, makeRng(4));
    for (const a of board.arrows) {
      expect(a.cells.length).toBeLessThanOrEqual(params.maxLength);
    }
  });

  it("points each head along its final segment", () => {
    // The arrowhead has to continue the line the body was already travelling,
    // or the drawn route and the direction it leaves in disagree.
    const board = scatter(params, makeRng(6));
    for (const a of board.arrows) {
      if (a.cells.length < 2) continue;
      const head = headOf(a);
      const prev = a.cells[a.cells.length - 2];
      const step = DIRS_FOR_TEST[a.dir];
      expect(head.row - prev.row).toBe(step.dy);
      expect(head.col - prev.col).toBe(step.dx);
    }
  });
});

describe("generate", () => {
  it("is deterministic for a seed", () => {
    expect(generate(params, 11)).toEqual(generate(params, 11));
  });

  it("differs between seeds", () => {
    expect(generate(params, 1)).not.toEqual(generate(params, 2));
  });

  it("produces well-formed boards", () => {
    for (let seed = 0; seed < 8; seed++) expectWellFormed(generate(params, seed));
  });

  it("always produces a solvable board", () => {
    for (let seed = 0; seed < 8; seed++) {
      expect(isSolvable(generate(params, seed))).toBe(true);
    }
  });

  it("respects the tightness bar it was given", () => {
    // The bar is the whole point: without it most arrows start free and the
    // level clears itself whatever the player taps.
    for (let seed = 0; seed < 8; seed++) {
      expect(freeRatio(generate(params, seed))).toBeLessThanOrEqual(
        params.maxFreeRatio + 0.001,
      );
    }
  });

  it("actually fills the board it was asked to fill", () => {
    // The bug this guards: dense random layouts are nearly always deadlocked,
    // so every candidate was rejected and generation returned its one-arrow
    // fallback. That board is solvable and well-formed, so every other
    // assertion here passed while the level was effectively empty.
    for (let seed = 0; seed < 6; seed++) {
      const board = generate(params, seed);
      const covered = board.arrows.reduce((n, a) => n + a.cells.length, 0);
      expect(covered / (params.size * params.size)).toBeGreaterThan(
        params.fillTarget - 0.15,
      );
    }
  });

  it("never places a stub with no body to follow", () => {
    for (let seed = 0; seed < 8; seed++) {
      for (const a of generate(params, seed).arrows) {
        expect(a.cells.length).toBeGreaterThanOrEqual(MIN_LENGTH);
      }
    }
  });

  it("still returns a playable board when the bar is impossible", () => {
    const cruel: LevelParams = { size: 4, maxLength: 3, fillTarget: 0.7, maxFreeRatio: 0.0001 };
    const board = generate(cruel, 3);
    expectWellFormed(board);
    expect(isSolvable(board)).toBe(true);
  });
});

describe("paramsForLevel", () => {
  it("starts small and forgiving, but already packed", () => {
    const p = paramsForLevel(1);
    expect(p.size).toBe(7);
    expect(p.maxLength).toBe(3);
    expect(p.maxFreeRatio).toBeGreaterThan(0.6);
    // Even level one should read as a maze rather than as scattered pieces.
    expect(p.fillTarget).toBeGreaterThanOrEqual(0.5);
  });

  it("packs tighter and tightens the reading as levels climb", () => {
    expect(paramsForLevel(20).fillTarget).toBeGreaterThan(paramsForLevel(1).fillTarget);
    expect(paramsForLevel(20).maxFreeRatio).toBeLessThan(paramsForLevel(1).maxFreeRatio);
  });

  it("lengthens tracks as levels climb", () => {
    expect(paramsForLevel(30).maxLength).toBeGreaterThan(paramsForLevel(1).maxLength);
  });

  it("always leaves gaps for arrows to travel through", () => {
    // A board with no empty cells deadlocks far more often than it entertains.
    for (let n = 1; n <= 80; n++) {
      expect(paramsForLevel(n).fillTarget).toBeLessThanOrEqual(0.85);
    }
  });

  it("never tightens past the floor", () => {
    expect(paramsForLevel(500).maxFreeRatio).toBeGreaterThanOrEqual(0.28);
  });

  it("never loses ground as the level climbs", () => {
    let fill = 0;
    let ratio = 1;
    for (let n = 1; n <= 80; n++) {
      const p = paramsForLevel(n);
      expect(p.fillTarget).toBeGreaterThanOrEqual(fill - 0.001);
      expect(p.maxFreeRatio).toBeLessThanOrEqual(ratio + 0.001);
      fill = p.fillTarget;
      ratio = p.maxFreeRatio;
    }
  });

  it("clamps zero and negative input to level one", () => {
    expect(paramsForLevel(0)).toEqual(paramsForLevel(1));
    expect(paramsForLevel(-7)).toEqual(paramsForLevel(1));
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
    expect(levelFor(4)).toEqual(levelFor(4));
  });

  it("asks the generator only for tightness it can actually deliver", () => {
    // A curve that demands an unreachable free ratio does not fail loudly: every
    // rung of the relaxation ladder is exhausted, the board arrives looser than
    // requested anyway, and the only symptom is that building one level takes
    // seconds. Levels 22+ once asked for 0.30 when the floor is nearer 0.45,
    // which cost ~600ms each. Meeting the bar is what keeps generation quick.
    for (const level of [1, 5, 12, 22, 40]) {
      const p = paramsForLevel(level);
      expect(freeRatio(levelFor(level))).toBeLessThanOrEqual(p.maxFreeRatio + 0.001);
    }
  });

  it("produces solvable boards across the curve, with a real decision in each", () => {
    for (let level = 1; level <= 40; level++) {
      const board = levelFor(level);
      expectWellFormed(board);

      // Every level must be a real board, not the emergency fallback.
      const p = paramsForLevel(level);
      const covered = board.arrows.reduce((n, a) => n + a.cells.length, 0);
      expect(covered / (p.size * p.size)).toBeGreaterThan(p.fillTarget - 0.15);

      const t = trace(board);
      expect(t.solved).toBe(true);
      expect(t.order).toHaveLength(board.arrows.length);

      // At some point the player must find the one arrow that is free; a board
      // where several are always available is not asking anything of them.
      expect(Math.min(...t.freeCounts)).toBeLessThanOrEqual(3);

      // The recorded order must survive being replayed through the real rules.
      let state = board;
      for (const id of t.order) state = applyMove(state, { id });
      expect(isSolved(state)).toBe(true);
    }
  }, 120_000);
});
