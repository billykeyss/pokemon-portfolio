import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { candidatesForGrid, digitsOf } from "./candidates";
import { CELLS } from "./grid";
import { hardestRank, tierOfRank } from "./grade";
import { countSolutions } from "./solve";
import type { Cell, Grid, Puzzle, Tier } from "./types";

/**
 * Roughly how many givens to stop carving at, per tier.
 *
 * Difficulty is decided by grading, not by this number — but carving further
 * reliably produces harder puzzles, so stopping early is how the generator
 * aims at a tier instead of sampling blindly and rejecting almost everything.
 */
export const TARGET_GIVENS: Record<Tier, number> = {
  easy: 38,
  medium: 30,
  hard: 26,
  expert: 22,
};

export const MAX_ATTEMPTS = 24;

/**
 * How many maximum-pressure attempts the terminal fallback gets before giving
 * up entirely.
 *
 * Generous on purpose, and knowingly past the budget: at roughly 33ms an
 * attempt this many would take about 3.3s, over the 3000ms ceiling. The
 * trade is deliberate — reaching here at all means the main loop failed
 * MAX_ATTEMPTS rising-pressure times to find so much as a rank-0 board, which
 * has never been observed, and a board that takes too long still beats the
 * alternative of handing back nothing. A tighter cap would only make this
 * path fail faster, not sooner.
 */
const FALLBACK_ATTEMPTS = 100;

/**
 * How many fewer givens each successive attempt asks `carve` for, on top of
 * `pressure`'s own floor. Tuned empirically alongside TARGET_GIVENS — see
 * generate.ts's tuning notes in the task report.
 */
const PRESSURE_STEP = 2;

function shuffled(items: number[], rng: Rng): number[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A complete grid, built by randomised backtracking. */
export function fullGrid(rng: Rng): Grid {
  const grid = new Array(CELLS).fill(0) as Cell[];

  const fill = (): boolean => {
    const cands = candidatesForGrid(grid);

    let best = -1;
    let bestCount = 10;
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] !== 0) continue;
      const n = digitsOf(cands[i]).length;
      if (n === 0) return false;
      if (n < bestCount) {
        best = i;
        bestCount = n;
      }
    }
    if (best === -1) return true;

    for (const d of shuffled(digitsOf(cands[best]), rng)) {
      grid[best] = d as Cell;
      if (fill()) return true;
      grid[best] = 0;
    }
    return false;
  };

  fill();
  return grid;
}

/**
 * The floor below which carving is not attempted, at any pressure.
 *
 * Below this, uniqueness gets expensive to hold onto and boards drift toward
 * pathological rather than merely hard.
 */
const MIN_GIVENS = 22;

/**
 * Remove givens in random order, keeping a removal only while the puzzle still
 * has exactly one solution.
 *
 * Stops once the tier's (pressure-adjusted) target is reached. Carving past it
 * makes a harder puzzle, which is right for Expert and wrong for Easy.
 *
 * `pressure` lets a retry ask more of the board than the last one did. A
 * retry that carves to the same target as the attempt before it is a wasted
 * roll — it resamples the same difficulty distribution and hopes for
 * different noise. Rising pressure walks the target down instead, so attempts
 * that keep landing too easy keep asking for more.
 *
 * It only walks for the first few attempts, though: the target bottoms out at
 * `MIN_GIVENS` by roughly attempt 8 for easy, 4 for medium, 2 for hard and 0
 * for expert, whose target already sits on the floor. Past that point every
 * remaining attempt of the budget carves to the same depth and differs only in
 * its shuffle — which is also why raising pressure never moved expert's hit
 * rate.
 */
export function carve(solution: Grid, rng: Rng, tier: Tier, pressure = 0): Grid {
  const target = Math.max(MIN_GIVENS, TARGET_GIVENS[tier] - pressure);
  const grid = [...solution] as Cell[];
  let remaining = CELLS;

  for (const i of shuffled([...Array(CELLS).keys()], rng)) {
    if (remaining <= target) break;

    const kept = grid[i];
    grid[i] = 0;
    if (countSolutions(grid, 2) === 1) {
      remaining--;
    } else {
      grid[i] = kept;
    }
  }

  return grid;
}

/**
 * A puzzle at the requested tier, reproducible from its seed.
 *
 * Attempts are capped. A player waiting on a generator is worse than a player
 * handed a Hard puzzle when they asked for Expert, so when the budget runs out
 * this returns the closest graded candidate rather than looping.
 */
export function puzzleFor(tier: Tier, seed: number): Puzzle {
  let closest: Puzzle | null = null;

  // The least-preferred graded result seen anywhere below, including rank 0.
  // Kept as a fallback of last resort: trivial, but still honest and playable,
  // which beats every other way this function could end up returning.
  let lastGraded: Puzzle | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = makeRng(seed + attempt * 7919);
    const solution = fullGrid(rng);
    const givens = carve(solution, rng, tier, attempt * PRESSURE_STEP);

    const rank = hardestRank(givens);
    if (rank !== null) lastGraded = { givens, solution, tier: tierOfRank(rank), seed };

    // Rank 0 means naked singles alone finish the board. This game draws every
    // cell's candidates, so such a board holds no deduction at all — it is
    // solved by tapping, not thinking. Hidden singles are Easy's floor, which
    // puts a rank-0 board below every tier, not merely below the one asked for.
    if (rank === null || rank === 0) continue;

    const puzzle: Puzzle = { givens, solution, tier: tierOfRank(rank), seed };
    if (puzzle.tier === tier) return puzzle;
    closest ??= puzzle;
  }

  if (closest !== null) return closest;

  // The main loop never produced a single board with a deduction in it —
  // vanishingly unlikely across MAX_ATTEMPTS rising-pressure tries, but a game
  // must deal a board rather than throw. Carve at maximum pressure (the floor)
  // against a fresh batch of solutions, under the same rank-0 guard as above,
  // and take the first one with an actual deduction in it.
  for (let attempt = 0; attempt < FALLBACK_ATTEMPTS; attempt++) {
    const rng = makeRng(seed + (MAX_ATTEMPTS + attempt) * 7919);
    const solution = fullGrid(rng);
    const givens = carve(solution, rng, tier, TARGET_GIVENS[tier]);

    const rank = hardestRank(givens);
    if (rank !== null) lastGraded = { givens, solution, tier: tierOfRank(rank), seed };

    if (rank === null || rank === 0) continue;
    return { givens, solution, tier: tierOfRank(rank), seed };
  }

  // Every guarded attempt, in both loops, either failed to grade at all or
  // graded at rank 0. Totality still requires a return, and a trivial-but-
  // honest board beats every remaining option: hand back whatever last graded,
  // rank and all.
  if (lastGraded !== null) return lastGraded;

  // Not expected to occur, and not observed in any measurement: nothing in
  // either loop graded at any rank, meaning every candidate board stalled our
  // six techniques before finishing. An ungradeable board is not easy — it is
  // harder than Expert, since Expert is merely the hardest rank the techniques
  // *can* prove. Labelling it "easy" would promise a gentle board and hand the
  // player one the hint button cannot help with at all, so it is labelled
  // "expert" instead: the honest floor for something above the ladder's top.
  const rng = makeRng(seed + (MAX_ATTEMPTS + FALLBACK_ATTEMPTS) * 7919);
  const solution = fullGrid(rng);
  const givens = carve(solution, rng, tier, TARGET_GIVENS[tier]);
  return { givens, solution, tier: "expert", seed };
}
