export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShelfLayout {
  /** Box of each column of goods. */
  columns: Rect[];
  /** Box of each tray slot. */
  tray: Rect[];
  /** Side length of an item on the shelves. */
  item: number;
  /** Side length of an item in the tray, which holds more across less width. */
  trayItem: number;
  /** How many items a column shows before it starts overlapping them. */
  visibleDepth: number;
}

const GAP_RATIO = 0.22;
/** Share of the canvas height given to the tray, including its margin. */
const TRAY_BAND = 0.26;

/**
 * Shelves fill the upper area, the tray sits along the bottom.
 *
 * Both are sized to whichever of width or height binds, so a crowded late
 * level and a sparse early one both fill the frame. Pure — no canvas — so it
 * can be asserted on.
 */
export function layoutShelf(
  columnCount: number,
  maxDepth: number,
  traySize: number,
  canvasW: number,
  canvasH: number,
): ShelfLayout {
  const cols = Math.max(1, columnCount);
  const slots = Math.max(1, traySize);
  const depth = Math.max(1, maxDepth);

  const shelfH = canvasH * (1 - TRAY_BAND);
  const trayH = canvasH * TRAY_BAND;

  /**
   * The shelves and the tray are sized independently.
   *
   * The tray always holds more slots across the same width than the shelves
   * have columns, so a single shared size would let the tray dictate terms and
   * leave the shelves — the part the player is actually reading — small and
   * marooned in empty space.
   */
  const byColumnWidth = canvasW / (cols + (cols + 1) * GAP_RATIO);
  const byShelfHeight = shelfH / (depth + (depth + 1) * GAP_RATIO * 0.6);
  const item = Math.max(1, Math.min(byColumnWidth, byShelfHeight));

  const bySlotWidth = canvasW / (slots + (slots + 1) * GAP_RATIO);
  const trayItem = Math.max(1, Math.min(bySlotWidth, trayH * 0.72));

  const gap = item * GAP_RATIO;

  const columnsWidth = cols * item + (cols - 1) * gap;
  const columnStartX = (canvasW - columnsWidth) / 2;
  const columnH = depth * item + (depth - 1) * gap * 0.6;
  const columnY = Math.max(0, (shelfH - columnH) / 2);

  const columns: Rect[] = [];
  for (let i = 0; i < cols; i++) {
    columns.push({
      x: columnStartX + i * (item + gap),
      y: columnY,
      w: item,
      h: columnH,
    });
  }

  const trayGap = trayItem * GAP_RATIO;
  const trayWidth = slots * trayItem + (slots - 1) * trayGap;
  const trayY = shelfH + (trayH - trayItem) / 2;

  const tray: Rect[] = [];
  for (let i = 0; i < slots; i++) {
    tray.push({
      x: (canvasW - trayWidth) / 2 + i * (trayItem + trayGap),
      y: trayY,
      w: trayItem,
      h: trayItem,
    });
  }

  return { columns, tray, item, trayItem, visibleDepth: depth };
}

/**
 * Box of one item in a column. `fromFront` counts back from the reachable item,
 * which sits at the bottom of the column — nearest the tray, and nearest the
 * player's thumb.
 */
export function itemSlot(
  layout: ShelfLayout,
  column: number,
  fromFront: number,
): Rect {
  const box = layout.columns[column];
  const gap = layout.item * GAP_RATIO * 0.6;
  const step = layout.item + gap;

  return {
    x: box.x,
    y: box.y + box.h - layout.item - fromFront * step,
    w: layout.item,
    h: layout.item,
  };
}

/** Column under a point, or null. The whole column is the touch target. */
export function columnAt(layout: ShelfLayout, x: number, y: number): number | null {
  const pad = layout.item * 0.12;

  for (let i = 0; i < layout.columns.length; i++) {
    const box = layout.columns[i];
    if (
      x >= box.x - pad &&
      x <= box.x + box.w + pad &&
      y >= box.y - pad &&
      y <= box.y + box.h + pad
    ) {
      return i;
    }
  }
  return null;
}
