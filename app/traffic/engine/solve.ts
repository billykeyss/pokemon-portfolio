import {
  DEFAULT_NODE_CAP,
  firstMove,
  search,
  type SearchResult,
  type SearchSpec,
} from "@/app/game/_shared/search";
import { applyMove, isSolved, legalMoves } from "./rules";
import type { Board, Move } from "./types";

export type SolveResult = SearchResult<Move>;
export { DEFAULT_NODE_CAP };

/**
 * Vehicle identities are fixed and vehicles cannot pass one another, so a board
 * is fully described by where each one sits, in id order.
 */
export function canonicalKey(board: Board): string {
  return board.vehicles.map((v) => `${v.row}.${v.col}`).join("|");
}

const SPEC: SearchSpec<Board, Move> = {
  key: canonicalKey,
  moves: legalMoves,
  apply: applyMove,
  solved: isSolved,
};

/**
 * Breadth-first, because the move count is shown to the player as par. A
 * depth-first solution would be found sooner but would be an arbitrary length,
 * which makes it worthless as a score to beat.
 */
export function solve(board: Board, nodeCap: number = DEFAULT_NODE_CAP): SolveResult {
  return search(board, SPEC, { nodeCap, strategy: "bfs" });
}

/** Length of the shortest solution, or null if there isn't one within budget. */
export function parFor(board: Board, nodeCap: number = DEFAULT_NODE_CAP): number | null {
  const result = solve(board, nodeCap);
  return result.status === "solved" ? result.moves.length : null;
}

/**
 * Is this board solvable at all? Depth-first, because any solution answers the
 * question and the shortest one costs far more to find.
 */
export function isSolvable(board: Board, nodeCap: number = DEFAULT_NODE_CAP): boolean {
  return search(board, SPEC, { nodeCap, strategy: "dfs" }).status === "solved";
}

export type DepthProbe =
  /** Solvable within the bound, in exactly this many moves. */
  | { kind: "par"; moves: number }
  /** Proved to need more moves than the bound. */
  | { kind: "deeper" }
  /** Ran out of search budget; nothing was proved either way. */
  | { kind: "unknown" };

/**
 * Ask whether a board's par exceeds `maxDepth`, without computing the par when
 * it does.
 *
 * The three outcomes must stay distinct. Collapsing "deeper" and "unknown" into
 * one answer would let a board that merely exhausted the search budget pass as
 * a hard one, which is how an unsolvable board reaches a player.
 */
export function parWithin(
  board: Board,
  maxDepth: number,
  nodeCap: number = DEFAULT_NODE_CAP,
): DepthProbe {
  if (maxDepth < 1) return { kind: "deeper" };

  const result = search(board, SPEC, { nodeCap, strategy: "bfs", maxDepth });
  if (result.status === "solved") return { kind: "par", moves: result.moves.length };
  if (result.status === "unsolvable") return { kind: "unknown" };
  return result.reason === "depthCap" ? { kind: "deeper" } : { kind: "unknown" };
}

/** The next move on a shortest path, or null if there is none. */
export function hint(board: Board): Move | null {
  return firstMove(board, SPEC, { strategy: "bfs" });
}
