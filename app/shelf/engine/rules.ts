import { MATCH, type Move, type Shelf } from "./types";

/** The only reachable item in a column, or null when it is empty. */
export function frontOf(column: number[]): number | null {
  return column.length === 0 ? null : column[column.length - 1];
}

export function cloneShelf(shelf: Shelf): Shelf {
  return {
    ...shelf,
    columns: shelf.columns.map((c) => [...c]),
    tray: [...shelf.tray],
  };
}

/**
 * Remove every complete set from a tray.
 *
 * Loops until nothing more clears: taking one set out can leave the remaining
 * items forming another, which a single pass would miss.
 */
export function resolveTray(tray: number[]): number[] {
  let current = [...tray];

  for (;;) {
    const counts = new Map<number, number>();
    for (const type of current) counts.set(type, (counts.get(type) ?? 0) + 1);

    const full = [...counts.entries()].find(([, n]) => n >= MATCH);
    if (full === undefined) return current;

    let removed = 0;
    current = current.filter((type) => {
      if (type === full[0] && removed < MATCH) {
        removed++;
        return false;
      }
      return true;
    });
  }
}

/** Room on the tray right now. A move is only legal while at least one slot is free. */
export function trayFree(shelf: Shelf): number {
  return shelf.traySize - shelf.tray.length;
}

export function canTake(shelf: Shelf, column: number): boolean {
  const stack = shelf.columns[column];
  if (stack === undefined || stack.length === 0) return false;
  return trayFree(shelf) > 0;
}

/** Returns a NEW shelf. Undo and the solver both depend on cheap snapshots. */
export function applyMove(shelf: Shelf, move: Move): Shelf {
  if (!canTake(shelf, move.column)) {
    throw new Error(`illegal take from column ${move.column}`);
  }

  const next = cloneShelf(shelf);
  const item = next.columns[move.column].pop();
  if (item === undefined) throw new Error("empty column passed canTake");

  next.tray.push(item);
  next.tray = resolveTray(next.tray);
  return next;
}

export function isSolved(shelf: Shelf): boolean {
  return shelf.columns.every((c) => c.length === 0) && shelf.tray.length === 0;
}

export function legalMoves(shelf: Shelf): Move[] {
  if (trayFree(shelf) <= 0) return [];

  const moves: Move[] = [];
  const seen = new Set<number>();

  for (let column = 0; column < shelf.columns.length; column++) {
    const front = frontOf(shelf.columns[column]);
    if (front === null) continue;

    // Two columns showing the same item offer the same move this turn, but they
    // are not interchangeable — what sits behind them differs. Dedupe only when
    // the whole remaining column matches.
    const key = shelf.columns[column].join(",");
    if (seen.has(hash(key))) continue;
    seen.add(hash(key));

    moves.push({ column });
  }

  return moves;
}

/** Cheap string hash, so the dedupe set holds numbers rather than strings. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * No moves left and not finished — the tray has filled with items that cannot
 * pair up. The player must undo or restart.
 */
export function isStuck(shelf: Shelf): boolean {
  return !isSolved(shelf) && legalMoves(shelf).length === 0;
}

/**
 * Identity of a position. Column *order* on screen is fixed, but for solving,
 * two arrangements holding the same columns are the same problem — so the
 * encodings are sorted. The tray is a multiset, so it is sorted too.
 */
export function canonicalKey(shelf: Shelf): string {
  const columns = shelf.columns
    .map((c) => c.join(","))
    .sort()
    .join("|");
  const tray = [...shelf.tray].sort((a, b) => a - b).join(",");
  return `${columns}#${tray}`;
}
