/**
 * One position on a shelf, holding items stacked front-to-back.
 *
 * The last element is at the front and is the only one a player can touch;
 * everything before it is buried and shows dimmed until what is in front of it
 * is cleared away.
 */
export type Slot = number[];

/** Slots per shelf. Also the number of matching items a shelf needs to clear. */
export const SHELF_WIDTH = 3;

export interface Board {
  /** Each shelf is exactly SHELF_WIDTH slots. */
  shelves: Slot[][];
  /** Distinct goods in play. Each contributes exactly SHELF_WIDTH copies. */
  types: number;
}

/**
 * Take the front item of one slot and set it down on another shelf.
 *
 * The destination is a shelf rather than a slot: slots on a shelf are
 * interchangeable, so naming one would invent a distinction the game does not
 * have — and would multiply the solver's branching for nothing.
 */
export interface Move {
  fromShelf: number;
  fromSlot: number;
  toShelf: number;
}

export interface LevelParams {
  types: number;
  shelves: number;
  /** Slots left empty at the deal, which is the only reason anything can move. */
  freeSlots: number;
}
