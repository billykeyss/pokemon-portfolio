import {
  DEFAULT_NODE_CAP,
  firstMove,
  search,
  type SearchResult,
  type SearchSpec,
} from "@/app/game/_shared/search";
import { applyMove, isSolved, legalMoves, topRun } from "./rules";
import type { Move, Puzzle } from "./types";

export type SolveResult = SearchResult<Move>;
export { DEFAULT_NODE_CAP };

/**
 * Bottle order carries no meaning, so sorting the per-bottle encodings collapses
 * every permutation of the same arrangement onto one key. This is the single
 * biggest win in the search — without it the visited set barely prunes.
 */
export function canonicalKey(p: Puzzle): string {
  return p.bottles
    .map((b) => b.join(","))
    .sort()
    .join("|");
}

/** Prefer moves that finish a colour, then ones that empty a bottle outright. */
function scoreMove(p: Puzzle, m: Move): number {
  const src = p.bottles[m.from];
  const dst = p.bottles[m.to];
  const run = topRun(src);
  if (run === null) return 0;

  const moved = Math.min(run.count, p.capacity - dst.length);
  let score = moved;

  const dstUniform = dst.length === 0 || dst.every((c) => c === run.color);
  if (dstUniform && dst.length + moved === p.capacity) score += 100;
  if (moved === src.length) score += 50;

  return score;
}

const SPEC: SearchSpec<Puzzle, Move> = {
  key: canonicalKey,
  moves: legalMoves,
  apply: applyMove,
  solved: isSolved,
  score: scoreMove,
};

/**
 * Depth-first: generation only needs to know a candidate is solvable at all, and
 * the move count is never shown as a par, so a shortest path would be paid for
 * and thrown away.
 */
export function solve(p: Puzzle, nodeCap: number = DEFAULT_NODE_CAP): SolveResult {
  return search(p, SPEC, { nodeCap, strategy: "dfs" });
}

/** The next move a solver would make from here, or null if there is none. */
export function hint(p: Puzzle): Move | null {
  return firstMove(p, SPEC);
}
