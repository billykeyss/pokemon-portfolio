import { SHELF_WIDTH } from "../engine/types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShelfLayout {
  /** Box of each shelf plank, spanning its three slots. */
  shelves: Rect[];
  /** Side length of an item sitting in a slot. */
  item: number;
  /** Vertical thickness of the plank drawn under each shelf. */
  plank: number;
}

/** Horizontal gap between slots, as a fraction of item size. */
const SLOT_GAP = 0.18;
/** Vertical gap between shelves, as a fraction of item size. */
const SHELF_GAP = 0.62;
/** Side margin, as a fraction of canvas width. */
const MARGIN = 0.04;

/**
 * Shelves stack down the canvas, each a row of three slots.
 *
 * Item size is whichever of width or height binds: a wide, short canvas runs
 * out of vertical room first, a narrow phone runs out of width. Sizing to the
 * tighter of the two keeps every board — four shelves or seven — filling the
 * frame without ever overflowing it.
 *
 * Pure — no canvas — so it can be asserted on.
 */
export function layoutShelves(
  shelfCount: number,
  canvasW: number,
  canvasH: number,
): ShelfLayout {
  const rows = Math.max(1, shelfCount);

  const usableW = canvasW * (1 - MARGIN * 2);
  const byWidth = usableW / (SHELF_WIDTH + (SHELF_WIDTH - 1) * SLOT_GAP);
  const byHeight = canvasH / (rows + (rows + 1) * SHELF_GAP);

  const item = Math.max(1, Math.min(byWidth, byHeight));
  const slotGap = item * SLOT_GAP;
  const shelfGap = item * SHELF_GAP;

  const shelfW = SHELF_WIDTH * item + (SHELF_WIDTH - 1) * slotGap;
  const stride = item + shelfGap;
  const totalH = rows * stride + shelfGap;
  const startY = Math.max(0, (canvasH - totalH) / 2) + shelfGap;

  const shelves: Rect[] = [];
  for (let i = 0; i < rows; i++) {
    shelves.push({
      x: (canvasW - shelfW) / 2,
      y: startY + i * stride,
      w: shelfW,
      h: item,
    });
  }

  return { shelves, item, plank: Math.max(3, item * 0.1) };
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

/**
 * Slot under a point, or null.
 *
 * Also reports the shelf on its own, because tapping the empty part of a shelf
 * is how a player chooses where to put the item they picked up.
 */
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

/** Shelf under a point, counting the whole plank width as the target. */
export function shelfAt(layout: ShelfLayout, x: number, y: number): number | null {
  for (let shelf = 0; shelf < layout.shelves.length; shelf++) {
    const box = layout.shelves[shelf];
    const padY = layout.item * 0.3;
    if (
      x >= box.x - layout.item * 0.5 &&
      x <= box.x + box.w + layout.item * 0.5 &&
      y >= box.y - padY &&
      y <= box.y + box.h + padY
    ) {
      return shelf;
    }
  }
  return null;
}
