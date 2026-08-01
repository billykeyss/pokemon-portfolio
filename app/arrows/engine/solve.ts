import { applyMove, freeArrows, isSolved } from "./rules";
import type { Board, Move } from "./types";

export interface Trace {
  solved: boolean;
  /** Arrow ids in the order they were released. */
  order: number[];
  /** How many arrows were releasable at each step, before that step's move. */
  freeCounts: number[];
  /** Arrows still stuck when the board deadlocked. Empty on a solve. */
  stranded: number;
}

/**
 * Solve by repeatedly releasing whatever is free.
 *
 * No search, and none is needed: removing an arrow can only ever *clear* another
 * arrow's path, never create a new obstruction. So the set of arrows that will
 * eventually become releasable is fixed by the starting board, and greedily
 * taking any free arrow can never strand one that a cleverer order would have
 * saved.
 *
 * That is a strong property and worth stating plainly, because it decides what
 * this game is: there is no wrong choice, only a wrong *guess* about which
 * arrows are currently free. The difficulty lives entirely in reading the board.
 * It also means solvability costs O(n^2) rather than a state-space search, which
 * is why generation here is instant compared to the other games.
 */
export function trace(board: Board): Trace {
  let state = board;
  const order: number[] = [];
  const freeCounts: number[] = [];

  for (;;) {
    if (isSolved(state)) {
      return { solved: true, order, freeCounts, stranded: 0 };
    }

    const free = freeArrows(state);
    if (free.length === 0) {
      return { solved: false, order, freeCounts, stranded: state.arrows.length };
    }

    freeCounts.push(free.length);
    order.push(free[0].id);
    state = applyMove(state, { id: free[0].id });
  }
}

export function isSolvable(board: Board): boolean {
  return trace(board).solved;
}

/**
 * How hard the board is to *read*, as the mean share of remaining arrows that
 * are releasable at each step.
 *
 * Near 1 every arrow is free and the level plays itself. Near 0 there is only
 * ever one right answer on the board and the player has to find it. This is the
 * only difficulty dial the mechanic offers, so generation tunes against it
 * directly rather than against arrow count, which merely makes boards bigger.
 */
export function freeRatio(board: Board): number {
  const t = trace(board);
  if (!t.solved || t.freeCounts.length === 0) return 1;

  let total = 0;
  let remaining = board.arrows.length;
  for (const free of t.freeCounts) {
    total += free / remaining;
    remaining--;
  }

  return total / t.freeCounts.length;
}

/** Any arrow the player could release right now, or null if the board is stuck. */
export function hint(board: Board): Move | null {
  const free = freeArrows(board);
  return free.length === 0 ? null : { id: free[0].id };
}
