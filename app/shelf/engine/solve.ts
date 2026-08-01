import {
  DEFAULT_NODE_CAP,
  firstMove,
  search,
  type SearchResult,
  type SearchSpec,
} from "@/app/game/_shared/search";
import { applyMove, canonicalKey, isSolved, legalMoves } from "./rules";
import type { Move, Shelf } from "./types";

export type SolveResult = SearchResult<Move>;
export { DEFAULT_NODE_CAP };

/** Prefer takes that complete a set now, then ones that pair with the tray. */
function scoreMove(shelf: Shelf, move: Move): number {
  const column = shelf.columns[move.column];
  const front = column[column.length - 1];
  const held = shelf.tray.filter((t) => t === front).length;

  // Completing a set frees two slots; pairing sets one up. Emptying a column
  // is worth a little on its own, since it opens what was behind it.
  if (held === 2) return 100;
  if (held === 1) return 50;
  return column.length === 1 ? 10 : 1;
}

const SPEC: SearchSpec<Shelf, Move> = {
  key: canonicalKey,
  moves: legalMoves,
  apply: applyMove,
  solved: isSolved,
  score: scoreMove,
};

/**
 * Depth-first: generation only needs to know a board can be cleared, and the
 * move count is fixed by the item count anyway, so a shortest path would be
 * paid for and thrown away.
 */
export function solve(shelf: Shelf, nodeCap: number = DEFAULT_NODE_CAP): SolveResult {
  return search(shelf, SPEC, { nodeCap, strategy: "dfs" });
}

export function isSolvable(shelf: Shelf, nodeCap: number = DEFAULT_NODE_CAP): boolean {
  return solve(shelf, nodeCap).status === "solved";
}

/** The next take on a winning line, or null if there is none. */
export function hint(shelf: Shelf): Move | null {
  return firstMove(shelf, SPEC);
}
