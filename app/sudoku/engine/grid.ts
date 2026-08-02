import type { Idx, Unit } from "./types";

export const SIZE = 9;
export const CELLS = 81;

export const rowOf = (i: Idx): number => Math.floor(i / SIZE);
export const colOf = (i: Idx): number => i % SIZE;
export const boxOf = (i: Idx): number =>
  Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const build = (of: (i: Idx) => number): readonly (readonly Idx[])[] => {
  const groups: Idx[][] = Array.from({ length: SIZE }, () => []);
  for (let i = 0; i < CELLS; i++) groups[of(i)].push(i);
  return groups;
};

export const ROWS = build(rowOf);
export const COLS = build(colOf);
export const BOXES = build(boxOf);

export const UNITS: readonly Unit[] = [
  ...ROWS.map((_, index) => ({ kind: "row" as const, index })),
  ...COLS.map((_, index) => ({ kind: "col" as const, index })),
  ...BOXES.map((_, index) => ({ kind: "box" as const, index })),
];

export function cellsOf(unit: Unit): readonly Idx[] {
  if (unit.kind === "row") return ROWS[unit.index];
  if (unit.kind === "col") return COLS[unit.index];
  return BOXES[unit.index];
}

export function unitsOf(i: Idx): readonly Unit[] {
  return [
    { kind: "row", index: rowOf(i) },
    { kind: "col", index: colOf(i) },
    { kind: "box", index: boxOf(i) },
  ];
}

/**
 * The 20 cells constraining each cell, precomputed once at module load.
 *
 * Candidates are recomputed for the whole board on every move, so this lookup
 * runs 81 times per keystroke. Deriving it each time instead would make the
 * one operation the game performs constantly the one that costs the most.
 */
export const PEERS: readonly (readonly Idx[])[] = Array.from(
  { length: CELLS },
  (_, i) => {
    const set = new Set<Idx>();
    for (const unit of unitsOf(i)) for (const j of cellsOf(unit)) set.add(j);
    set.delete(i);
    return [...set];
  },
);
