import {
  DEFAULT_NODE_CAP,
  firstMove,
  search,
  type SearchResult,
  type SearchSpec,
} from "@/app/game/_shared/search";
import { applyMove, canonicalKey, frontOf, isSolved, legalMoves } from "./rules";
import type { Board, Move } from "./types";

export type SolveResult = SearchResult<Move>;
export { DEFAULT_NODE_CAP };

/**
 * Prefer moves that complete a shelf now, then ones that build toward a match.
 * Emptying a slot is worth a little on its own, since it uncovers what is
 * buried and opens the board up.
 */
function scoreMove(board: Board, move: Move): number {
  const item = frontOf(board.shelves[move.fromShelf][move.fromSlot]);
  if (item === null) return 0;

  const already = board.shelves[move.toShelf].filter((s) => frontOf(s) === item).length;
  const emptiesSlot = board.shelves[move.fromShelf][move.fromSlot].length === 1;

  if (already === 2) return 100;
  if (already === 1) return 50;
  return emptiesSlot ? 10 : 1;
}

const SPEC: SearchSpec<Board, Move> = {
  key: canonicalKey,
  moves: legalMoves,
  apply: applyMove,
  solved: isSolved,
  score: scoreMove,
};

/**
 * Depth-first: generation only needs to know a board can be cleared at all, and
 * the move count is never shown as a par, so a shortest path would be paid for
 * and thrown away.
 */
export function solve(board: Board, nodeCap: number = DEFAULT_NODE_CAP): SolveResult {
  return search(board, SPEC, { nodeCap, strategy: "dfs" });
}

export function isSolvable(board: Board, nodeCap: number = DEFAULT_NODE_CAP): boolean {
  return solve(board, nodeCap).status === "solved";
}

/** The next move on a winning line, or null if there is none. */
export function hint(board: Board): Move | null {
  return firstMove(board, SPEC);
}
