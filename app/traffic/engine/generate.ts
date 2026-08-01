import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { fitsOnBoard, isSolved, overlaps } from "./rules";
import { isSolvable, parWithin } from "./solve";
import { PLAYER_ID, type Board, type LevelParams, type Vehicle } from "./types";

/**
 * Total boards to try. Every attempt costs a breadth-first search, so this is
 * the knob that decides how long a player waits for a level. Sized so the worst
 * case — no candidate ever reaching the target — still lands inside a level
 * transition rather than becoming a visible stall.
 */
const MAX_ATTEMPTS = 14;
/**
 * Search budget while generating. Deliberately below the solver's own default:
 * a candidate too tangled to crack quickly is one to discard, not to wait on.
 */
const GEN_NODE_CAP = 9_000;
/** Sprite variants available for non-player vehicles. */
export const KIND_COUNT = 5;

/**
 * Vertical vehicles crossing the exit row to the right of the player are what
 * make the puzzle. Seeding a few deliberately, rather than hoping random
 * placement produces them, is the difference between finding a hard board in a
 * handful of attempts and hundreds.
 */
function placeBlockers(
  params: LevelParams,
  exitRow: number,
  player: Vehicle,
  vehicles: Vehicle[],
  rng: Rng,
): void {
  const columns: number[] = [];
  for (let c = player.col + player.len; c < params.size; c++) columns.push(c);

  // Fisher-Yates so the choice of blocking columns varies between seeds.
  for (let i = columns.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [columns[i], columns[j]] = [columns[j], columns[i]];
  }

  const wanted = Math.min(columns.length, 2 + rng.int(2));
  for (let i = 0; i < wanted && vehicles.length < params.vehicles; i++) {
    const len = rng.next() < 0.7 ? 2 : 3;
    const lowest = Math.max(0, exitRow - len + 1);
    const highest = Math.min(exitRow, params.size - len);
    if (highest < lowest) continue;

    const candidate: Vehicle = {
      id: vehicles.length,
      row: lowest + rng.int(highest - lowest + 1),
      col: columns[i],
      len,
      horizontal: false,
      kind: 1 + rng.int(KIND_COUNT - 1),
    };

    if (!fitsOnBoard(params, candidate)) continue;
    if (vehicles.some((v) => overlaps(v, candidate))) continue;

    vehicles.push(candidate);
    if (rng.next() < 0.75) pin(params, exitRow, candidate, vehicles, rng);
  }
}

/**
 * Park a horizontal vehicle in a blocker's way, so clearing the exit row takes
 * a move to free the blocker first.
 *
 * This second order is where the difficulty actually lives. A board of
 * independent blockers is shallow however many there are — each slides aside in
 * one move. Chaining them is what turns four vehicles into a ten-move puzzle,
 * and it makes hard boards common enough to find in a handful of draws rather
 * than hundreds.
 */
function pin(
  params: LevelParams,
  exitRow: number,
  blocker: Vehicle,
  vehicles: Vehicle[],
  rng: Rng,
): void {
  if (vehicles.length >= params.vehicles) return;

  // Directly above the blocker, or directly below it.
  const rows = rng.next() < 0.5
    ? [blocker.row - 1, blocker.row + blocker.len]
    : [blocker.row + blocker.len, blocker.row - 1];

  for (const row of rows) {
    // Never on the exit row: a horizontal vehicle there is unsolvable.
    if (row < 0 || row >= params.size || row === exitRow) continue;

    const len = rng.next() < 0.75 ? 2 : 3;
    for (const col of [blocker.col - 1, blocker.col, blocker.col - 2]) {
      const candidate: Vehicle = {
        id: vehicles.length,
        row,
        col,
        len,
        horizontal: true,
        kind: 1 + rng.int(KIND_COUNT - 1),
      };

      if (candidate.col < 0) continue;
      if (!fitsOnBoard(params, candidate)) continue;
      if (vehicles.some((v) => overlaps(v, candidate))) continue;

      vehicles.push(candidate);
      return;
    }
  }
}

/**
 * Lay out a random board. Two constraints are load-bearing:
 *
 *  - the player's car starts somewhere it has not already escaped from;
 *  - no *other* horizontal vehicle sits on the exit row. Such a vehicle could
 *    only ever slide along that row and could never let the player past, so any
 *    board containing one is unsolvable by construction.
 */
function layout(params: LevelParams, exitRow: number, rng: Rng): Board | null {
  const player: Vehicle = {
    id: PLAYER_ID,
    row: exitRow,
    // Leave at least two columns to the right, so blockers have somewhere to go.
    col: rng.int(Math.max(1, params.size - 3)),
    len: 2,
    horizontal: true,
    kind: 0,
  };

  const vehicles: Vehicle[] = [player];
  placeBlockers(params, exitRow, player, vehicles, rng);

  let guard = 0;
  while (vehicles.length < params.vehicles && guard < 400) {
    guard++;

    const horizontal = rng.next() < 0.5;
    const len = rng.next() < 0.72 ? 2 : 3;
    const candidate: Vehicle = {
      id: vehicles.length,
      row: rng.int(params.size),
      col: rng.int(params.size),
      len,
      horizontal,
      kind: 1 + rng.int(KIND_COUNT - 1),
    };

    if (horizontal && candidate.row === exitRow) continue;
    if (!fitsOnBoard(params, candidate)) continue;
    if (vehicles.some((v) => overlaps(v, candidate))) continue;

    vehicles.push(candidate);
  }

  if (vehicles.length < params.vehicles) return null;

  const board: Board = { size: params.size, vehicles, exitRow };
  return isSolved(board) ? null : board;
}

/**
 * Generate the board for a seed: keep drawing until one is hard enough, and
 * settle for the hardest seen if none reaches the target.
 *
 * Settling matters. A board needing sixteen moves is a rare draw, and a player
 * waiting on the generator is worse than a level a move easier than intended.
 * Boards solvable in fewer than two moves are never kept, so no level is ever
 * handed over already won.
 */
export function generate(params: LevelParams, seed: number): Board {
  const rng = makeRng(seed);
  const exitRow = Math.floor(params.size / 2) - 1;

  let best: Board | null = null;
  let bestPar = 1;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const board = layout(params, exitRow, rng);
    if (board === null) continue;

    // Ask only whether the board is hard enough, never what its par is: finding
    // the shortest solution on a crowded board is the most expensive thing
    // here, and a board that clears the bar stops at the bound instead.
    const probe = parWithin(board, params.minMoves - 1, GEN_NODE_CAP);

    if (probe.kind === "deeper") {
      // "Deeper than the bound" also describes an unsolvable board, so a
      // candidate has to be confirmed solvable before it is handed over. This
      // runs only on boards about to be returned — running it on every attempt
      // costs more than the search it guards.
      if (isSolvable(board, GEN_NODE_CAP)) return board;
      continue;
    }

    if (probe.kind === "unknown") continue;
    if (probe.moves < 2) continue;

    if (probe.moves > bestPar) {
      best = board;
      bestPar = probe.moves;
    }
  }

  if (best !== null) return best;

  // Nothing random worked. A player car plus one blocker always solves.
  return {
    size: params.size,
    exitRow,
    vehicles: [
      { id: PLAYER_ID, row: exitRow, col: 0, len: 2, horizontal: true, kind: 0 },
      { id: 1, row: exitRow, col: 3, len: 2, horizontal: false, kind: 1 },
    ],
  };
}
