import { SHELF_WIDTH, type Board, type Move, type Slot } from "./types";

/** The reachable item in a slot, or null when the slot is empty. */
export function frontOf(slot: Slot): number | null {
  return slot.length === 0 ? null : slot[slot.length - 1];
}

export function cloneBoard(board: Board): Board {
  return { ...board, shelves: board.shelves.map((shelf) => shelf.map((s) => [...s])) };
}

/** Index of a free slot on this shelf, or -1 if it is full. */
export function freeSlotIndex(board: Board, shelf: number): number {
  const slots = board.shelves[shelf];
  if (slots === undefined) return -1;
  return slots.findIndex((s) => s.length === 0);
}

/** The three front items of a shelf, with nulls where slots are empty. */
export function frontsOf(board: Board, shelf: number): (number | null)[] {
  return (board.shelves[shelf] ?? []).map(frontOf);
}

/** A shelf clears when every slot shows the same item. */
export function shelfMatches(board: Board, shelf: number): boolean {
  const fronts = frontsOf(board, shelf);
  if (fronts.length !== SHELF_WIDTH) return false;
  if (fronts.some((f) => f === null)) return false;
  return fronts.every((f) => f === fronts[0]);
}

/**
 * Clear every matching shelf, repeatedly.
 *
 * Looping matters: taking three items off a shelf uncovers whatever was buried
 * behind them, and that can complete another match immediately. A single pass
 * would leave the board in a state the player can see is finished but the game
 * does not.
 *
 * Mutates in place — callers here always own a fresh clone.
 */
export function resolveMatches(board: Board): number {
  let cleared = 0;

  for (;;) {
    const shelf = board.shelves.findIndex((_, i) => shelfMatches(board, i));
    if (shelf === -1) return cleared;

    for (const slot of board.shelves[shelf]) slot.pop();
    cleared++;
  }
}

export function canMove(board: Board, move: Move): boolean {
  if (move.fromShelf === move.toShelf) return false;

  const slot = board.shelves[move.fromShelf]?.[move.fromSlot];
  if (slot === undefined || slot.length === 0) return false;

  return freeSlotIndex(board, move.toShelf) !== -1;
}

/** Returns a NEW board. Undo and the solver both depend on cheap snapshots. */
export function applyMove(board: Board, move: Move): Board {
  if (!canMove(board, move)) {
    throw new Error(`illegal move: ${move.fromShelf}.${move.fromSlot} -> ${move.toShelf}`);
  }

  const next = cloneBoard(board);
  const item = next.shelves[move.fromShelf][move.fromSlot].pop();
  if (item === undefined) throw new Error("empty slot passed canMove");

  next.shelves[move.toShelf][freeSlotIndex(next, move.toShelf)].push(item);
  resolveMatches(next);
  return next;
}

export function isSolved(board: Board): boolean {
  return board.shelves.every((shelf) => shelf.every((slot) => slot.length === 0));
}

/**
 * Every legal move, with the duplicates that the board's own symmetries create
 * stripped out.
 *
 * Two slots on one shelf showing the same item offer the same move, and so does
 * every free slot on a destination shelf — the destination is chosen for the
 * player. Without both prunes the branching factor roughly triples and the
 * solver spends its budget re-examining boards it has already seen.
 */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  const targets: number[] = [];

  for (let shelf = 0; shelf < board.shelves.length; shelf++) {
    if (freeSlotIndex(board, shelf) !== -1) targets.push(shelf);
  }
  if (targets.length === 0) return moves;

  for (let shelf = 0; shelf < board.shelves.length; shelf++) {
    const seen = new Set<string>();

    for (let slot = 0; slot < board.shelves[shelf].length; slot++) {
      const stack = board.shelves[shelf][slot];
      if (stack.length === 0) continue;

      // Identical stacks on the same shelf are the same choice.
      const key = stack.join(",");
      if (seen.has(key)) continue;
      seen.add(key);

      for (const toShelf of targets) {
        if (toShelf === shelf) continue;
        moves.push({ fromShelf: shelf, fromSlot: slot, toShelf });
      }
    }
  }

  return moves;
}

/** Nothing left to do and not finished: every shelf is full and none matches. */
export function isStuck(board: Board): boolean {
  return !isSolved(board) && legalMoves(board).length === 0;
}

/**
 * Identity of a position.
 *
 * Shelves are interchangeable with each other and slots are interchangeable
 * within a shelf, so both are sorted before encoding. Two boards a player could
 * not tell apart must produce the same key, or the visited set barely prunes.
 */
export function canonicalKey(board: Board): string {
  return board.shelves
    .map((shelf) =>
      shelf
        .map((slot) => slot.join(","))
        .sort()
        .join("/"),
    )
    .sort()
    .join("|");
}

/** Items still on the board. */
export function remaining(board: Board): number {
  return board.shelves.reduce(
    (total, shelf) => total + shelf.reduce((n, slot) => n + slot.length, 0),
    0,
  );
}
