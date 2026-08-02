import { BLANK, FILLED, UNKNOWN, type Clue } from "./types";

export type LineResult =
  | { status: "ok"; line: Uint8Array; changed: number }
  | { status: "contradiction" };

/**
 * Placements are counted so a pathological line cannot hang the solver. The
 * real ceiling at 15 wide is a few hundred, so this is never reached; if it
 * ever were, the line is returned untouched rather than half-analysed, because
 * a partial enumeration would claim cells are forced that are not.
 */
const MAX_PLACEMENTS = 500_000;

/**
 * What a single line's clue forces, given what is already known.
 *
 * Every placement of the runs consistent with the known cells is enumerated and
 * the results intersected: a cell filled in every placement is forced filled,
 * blank in every placement is forced blank, and anything else stays unknown.
 *
 * Enumeration is chosen over a cleverer dynamic program because it is obviously
 * correct and can be checked exhaustively against brute force. At 15 cells the
 * worst case is a few hundred branches.
 */
export function solveLine(line: ArrayLike<number>, clue: Clue): LineResult {
  const n = line.length;
  const canFill = new Uint8Array(n);
  const canBlank = new Uint8Array(n);
  const placement = new Uint8Array(n);

  let placements = 0;
  let capped = false;

  const record = (): void => {
    for (let i = 0; i < n; i++) {
      if (placement[i] === 1) canFill[i] = 1;
      else canBlank[i] = 1;
    }
  };

  const place = (runIndex: number, from: number): void => {
    if (capped) return;

    if (runIndex === clue.length) {
      // Everything left over has to be empty.
      for (let i = from; i < n; i++) {
        if (line[i] === FILLED) return;
        placement[i] = 0;
      }
      if (++placements > MAX_PLACEMENTS) {
        capped = true;
        return;
      }
      record();
      return;
    }

    const len = clue[runIndex];
    for (let start = from; start + len <= n; start++) {
      // The gap before this run must hold no known-filled cell. Once one is
      // passed, every later start leaves it in the gap too — hence break.
      if (start > from && line[start - 1] === FILLED) break;

      let fits = true;
      for (let i = start; i < start + len; i++) {
        if (line[i] === BLANK) {
          fits = false;
          break;
        }
      }

      // A run must be followed by a gap, so the next cell cannot be filled.
      const after = start + len;
      if (fits && after < n && line[after] === FILLED) fits = false;

      if (fits) {
        for (let i = from; i < start; i++) placement[i] = 0;
        for (let i = start; i < after; i++) placement[i] = 1;
        if (after < n) placement[after] = 0;
        place(runIndex + 1, after + 1);
      }
    }
  };

  place(0, 0);

  if (capped) {
    const untouched = new Uint8Array(n);
    for (let i = 0; i < n; i++) untouched[i] = line[i];
    return { status: "ok", line: untouched, changed: 0 };
  }
  if (placements === 0) return { status: "contradiction" };

  const out = new Uint8Array(n);
  let changed = 0;

  for (let i = 0; i < n; i++) {
    const fill = canFill[i] === 1;
    const blank = canBlank[i] === 1;
    const value = fill && blank ? UNKNOWN : fill ? FILLED : BLANK;
    out[i] = value;
    if (value !== UNKNOWN && line[i] === UNKNOWN) changed++;
  }

  return { status: "ok", line: out, changed };
}
