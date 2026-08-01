import { SHELF_WIDTH } from "../engine/types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShelfLayout {
  /** Box of each shelf, spanning its three slots. */
  shelves: Rect[];
  /** Side length of an item sitting in a slot. */
  item: number;
  /** Vertical thickness of the plank drawn under each shelf. */
  plank: number;
  /** How many cabinets the shelves are split across. */
  columns: number;
  /** Outer bounds of each cabinet, for drawing its frame. */
  cabinets: Rect[];
  /** Floor the librarian walks along. */
  floorY: number;
}

/** Horizontal gap between slots, as a fraction of item size. */
const SLOT_GAP = 0.18;
/** Vertical gap between shelves, as a fraction of item size. */
const SHELF_GAP = 0.62;
/** Gap between cabinets, as a fraction of item size. */
const COLUMN_GAP = 0.5;
/** Side margin, as a fraction of canvas width. */
const MARGIN = 0.04;
/** Shelves beyond this many are split into a second cabinet. */
const SINGLE_COLUMN_MAX = 5;
/** Strip left below the cabinets for the librarian to walk along. */
const FLOOR_BAND = 0.16;

/**
 * Shelves stack down the canvas, split across one or two cabinets.
 *
 * The second cabinet is what makes a tall board possible. A single column of
 * three-slot shelves only ever needs about 60% of a phone's width, so height
 * binds long before width does and every added shelf shrinks the goods.
 * Splitting into two cabinets spends that idle width instead: measured, twelve
 * shelves in two columns draw at the same size as seven in one.
 *
 * Pure — no canvas — so it can be asserted on.
 */
export function layoutShelves(
  shelfCount: number,
  canvasW: number,
  canvasH: number,
): ShelfLayout {
  const count = Math.max(1, shelfCount);
  const columns = count > SINGLE_COLUMN_MAX ? 2 : 1;
  const rows = Math.ceil(count / columns);

  const shelfH = canvasH * (1 - FLOOR_BAND);
  const usableW = canvasW * (1 - MARGIN * 2);
  const perColumn = usableW / columns;

  const byWidth = perColumn / (SHELF_WIDTH + (SHELF_WIDTH - 1) * SLOT_GAP + COLUMN_GAP);
  const byHeight = shelfH / (rows + (rows + 1) * SHELF_GAP);

  const item = Math.max(1, Math.min(byWidth, byHeight));
  const slotGap = item * SLOT_GAP;
  const shelfGap = item * SHELF_GAP;
  const columnGap = item * COLUMN_GAP;

  const shelfW = SHELF_WIDTH * item + (SHELF_WIDTH - 1) * slotGap;
  const blockW = columns * shelfW + (columns - 1) * columnGap;
  const startX = (canvasW - blockW) / 2;

  const stride = item + shelfGap;
  const totalH = rows * stride + shelfGap;
  const startY = Math.max(0, (shelfH - totalH) / 2) + shelfGap;

  // Row-major, so the rows line up across both cabinets rather than one
  // cabinet running ahead of the other.
  const shelves: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    shelves.push({
      x: startX + col * (shelfW + columnGap),
      y: startY + row * stride,
      w: shelfW,
      h: item,
    });
  }

  const plank = Math.max(3, item * 0.1);
  const lastRowY = startY + (rows - 1) * stride + item + plank;

  const cabinets: Rect[] = [];
  for (let col = 0; col < columns; col++) {
    cabinets.push({
      x: startX + col * (shelfW + columnGap) - item * 0.3,
      y: startY - shelfGap * 0.7,
      w: shelfW + item * 0.6,
      h: lastRowY - startY + shelfGap * 0.9,
    });
  }

  // The floor has to clear the cabinet's outer frame, not just its last shelf.
  // Measured from the shelf alone, the librarian ends up standing on the bottom
  // row with the goods.
  const post = Math.max(4, item * 0.16);
  const cabinetBottom = cabinets[0].y + cabinets[0].h + post;

  return {
    shelves,
    item,
    plank,
    columns,
    cabinets,
    floorY: Math.min(canvasH, cabinetBottom + item * 0.12),
  };
}

/** Box of one slot on a shelf. */
export function slotRect(layout: ShelfLayout, shelf: number, slot: number): Rect {
  const box = layout.shelves[shelf];
  const gap = layout.item * SLOT_GAP;

  return {
    x: box.x + slot * (layout.item + gap),
    y: box.y,
    w: layout.item,
    h: layout.item,
  };
}

/** Slot under a point, or null. */
export function slotAt(
  layout: ShelfLayout,
  x: number,
  y: number,
): { shelf: number; slot: number } | null {
  for (let shelf = 0; shelf < layout.shelves.length; shelf++) {
    for (let slot = 0; slot < SHELF_WIDTH; slot++) {
      const rect = slotRect(layout, shelf, slot);
      const pad = layout.item * 0.08;
      if (
        x >= rect.x - pad &&
        x <= rect.x + rect.w + pad &&
        y >= rect.y - pad &&
        y <= rect.y + rect.h + pad
      ) {
        return { shelf, slot };
      }
    }
  }
  return null;
}

/**
 * Shelf under a point, counting the whole plank as the target.
 *
 * Padding is asymmetric on purpose: generous vertically, because a player
 * aiming at a shelf tends to tap near its goods rather than the plank, but
 * tight horizontally, since two cabinets sit side by side and overshooting one
 * must not land on the other.
 */
export function shelfAt(layout: ShelfLayout, x: number, y: number): number | null {
  const padX = layout.item * (layout.columns > 1 ? 0.2 : 0.5);
  const padY = layout.item * 0.3;

  for (let shelf = 0; shelf < layout.shelves.length; shelf++) {
    const box = layout.shelves[shelf];
    if (
      x >= box.x - padX &&
      x <= box.x + box.w + padX &&
      y >= box.y - padY &&
      y <= box.y + box.h + padY
    ) {
      return shelf;
    }
  }
  return null;
}
