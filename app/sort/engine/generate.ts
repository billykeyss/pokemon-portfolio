import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { isComplete, topRun } from "./rules";
import { solve } from "./solve";
import type { LevelParams, Puzzle } from "./types";

/** Attempts before falling back to a construction that cannot fail. */
const MAX_ATTEMPTS = 800;

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * How full each bottle starts.
 *
 * Dealing one full bottle per colour plus a couple of empties — the obvious
 * layout — means every bottle on the board is either brim-full or bone-empty,
 * and every level opens looking like the last one. Spreading the same liquid
 * across one extra bottle leaves slack *inside* bottles, so they start at
 * varying depths.
 *
 * The empties are carved out first and never shaved into, because they are what
 * makes the puzzle movable at all: without somewhere to decant, only a bottle
 * whose top already matches another's can be poured.
 */
export function fillPattern(params: LevelParams, rng: Rng): number[] {
  const holders = Math.max(1, params.bottles - params.empty);
  const total = params.colors * params.capacity;

  const fills = Array<number>(holders).fill(0);

  // A floor of one in every holder first, so the spread is between depths
  // rather than between "full" and "empty" — extra empty bottles are extra
  // maneuvering room, which is the opposite of what this is for.
  let left = total;
  for (let i = 0; i < holders && left > 0; i++) {
    fills[i] = 1;
    left--;
  }

  // Then scatter what remains. Filling greedily instead would top every bottle
  // up to capacity in turn and leave nothing to vary.
  let guard = 0;
  while (left > 0 && guard++ < 10_000) {
    const i = rng.int(holders);
    if (fills[i] >= params.capacity) continue;
    fills[i]++;
    left--;
  }

  for (let i = 0; i < params.empty; i++) fills.push(0);
  return shuffled(fills, rng);
}

/** Shuffle all units, then deal them into bottles at the chosen depths. */
export function deal(params: LevelParams, rng: Rng): Puzzle {
  const units: number[] = [];
  for (let c = 0; c < params.colors; c++) {
    for (let i = 0; i < params.capacity; i++) units.push(c);
  }

  const mixed = shuffled(units, rng);
  const fills = fillPattern(params, rng);

  const bottles: number[][] = [];
  let cursor = 0;
  for (const fill of fills) {
    bottles.push(mixed.slice(cursor, cursor + fill));
    cursor += fill;
  }

  return { bottles, capacity: params.capacity, colors: params.colors };
}

/** A deal that hands the player a finished colour for free is not a puzzle. */
export function isTrivial(p: Puzzle): boolean {
  return p.bottles.some((b) => isComplete(b, p.capacity));
}

/**
 * Walk backwards from the solved state, taking only moves that a single legal
 * pour undoes exactly.
 *
 * Two constraints make each step invertible, and both are load-bearing:
 *  - split off *part* of a run, never all of it, so the source's top colour is
 *    unchanged and can still receive the units back;
 *  - only move onto a bottle whose top is a different colour (or is empty), so
 *    the moved units land as a run of exactly the size we moved.
 *
 * The inverse of every step is therefore "pour the destination's whole top run
 * back onto the source", which is always legal. Solvability is preserved at
 * every step, so the result is solvable by construction.
 *
 * Drop either constraint and the guarantee evaporates: runs merge, the inverse
 * pour moves the wrong number of units, and the walk can strand itself in an
 * unsolvable state.
 */
export function shuffleFromSolved(params: LevelParams, rng: Rng): Puzzle {
  const bottles: number[][] = [];
  for (let c = 0; c < params.colors; c++) {
    bottles.push(Array<number>(params.capacity).fill(c));
  }
  // Pad to the board's full width, not just the guaranteed empties — the deal
  // this stands in for spreads the same liquid over more bottles.
  while (bottles.length < params.bottles) bottles.push([]);

  const steps = params.colors * params.capacity * 6;
  for (let step = 0; step < steps; step++) {
    const sources = bottles.filter((b) => (topRun(b)?.count ?? 0) >= 2);
    if (sources.length === 0) break;

    const src = rng.pick(sources);
    const run = topRun(src);
    if (run === null) continue;

    const targets = bottles.filter(
      (b) =>
        b !== src &&
        b.length < params.capacity &&
        (b.length === 0 || b[b.length - 1] !== run.color),
    );
    if (targets.length === 0) continue;

    const dst = rng.pick(targets);
    // Leave at least one unit behind, and never overfill the destination.
    const units = Math.min(1 + rng.int(run.count - 1), params.capacity - dst.length);
    if (units < 1) continue;

    for (let i = 0; i < units; i++) {
      src.pop();
      dst.push(run.color);
    }
  }

  return { bottles, capacity: params.capacity, colors: params.colors };
}

/**
 * Deal forward, then verify — a forward deal has the statistical character of a
 * real puzzle, where reverse-shuffling from a solved state tends to leave
 * giveaway structure.
 *
 * The fallback exists so this function is total: shuffleFromSolved is solvable
 * by construction, so a caller can never be handed an unsolvable level however
 * hostile the parameters.
 */
export function generate(params: LevelParams, seed: number): Puzzle {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = deal(params, rng);
    if (isTrivial(candidate)) continue;
    if (solve(candidate).status === "solved") return candidate;
  }

  // Retry the constructive walk a few times purely to avoid handing back a
  // puzzle with a colour already finished; any of them is solvable.
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = shuffleFromSolved(params, rng);
    if (!isTrivial(candidate)) return candidate;
  }
  return shuffleFromSolved(params, rng);
}
