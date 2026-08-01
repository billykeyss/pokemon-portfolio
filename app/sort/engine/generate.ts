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

/** Shuffle all units, then deal them into full bottles plus the spares. */
export function deal(params: LevelParams, rng: Rng): Puzzle {
  const units: number[] = [];
  for (let c = 0; c < params.colors; c++) {
    for (let i = 0; i < params.capacity; i++) units.push(c);
  }

  const mixed = shuffled(units, rng);
  const bottles: number[][] = [];
  for (let i = 0; i < params.colors; i++) {
    bottles.push(mixed.slice(i * params.capacity, (i + 1) * params.capacity));
  }
  for (let i = 0; i < params.free; i++) bottles.push([]);

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
  for (let i = 0; i < params.free; i++) bottles.push([]);

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
