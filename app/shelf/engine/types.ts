/** A stack of item types. The last entry is at the front, and is the only one reachable. */
export type Column = number[];

export interface Shelf {
  columns: Column[];
  /** Items held aside. Three matching ones clear together. */
  tray: number[];
  traySize: number;
  /** Distinct item types in play. Each contributes exactly MATCH copies. */
  types: number;
}

/** Take the front item of this column. */
export interface Move {
  column: number;
}

export interface LevelParams {
  types: number;
  columns: number;
  depth: number;
  traySize: number;
}

/** Items needed on the tray to clear a set. */
export const MATCH = 3;
