import {
  flyArc,
  flyProgress,
  liftAmount,
  popScale,
  type Fly,
} from "../engine/anim";
import { itemAt, SPRITE_SIZE } from "../engine/items";
import type { Shelf } from "../engine/types";
import { itemSlot, type Rect, type ShelfLayout } from "./layout";

export interface Pop {
  type: number;
  slots: number[];
  t: number;
}

export interface DrawState {
  shelf: Shelf;
  /** Pre-move snapshot; non-null only while an item is in flight. */
  before: Shelf | null;
  fly: Fly | null;
  pop: Pop | null;
  hinted: number | null;
  clock: number;
}

const BG = "#0d0a15";
const SHELF_BOARD = "#2a2038";
const SHELF_EDGE = "#4a3a5e";
const SLOT_EMPTY = "rgba(248, 240, 224, 0.07)";
const SLOT_EDGE = "rgba(248, 240, 224, 0.28)";

/** Draw one item's pixel grid into a box. */
function drawItem(
  ctx: CanvasRenderingContext2D,
  type: number,
  rect: Rect,
  alpha = 1,
  scale = 1,
): void {
  const art = itemAt(type);
  const size = (rect.w * scale) / SPRITE_SIZE;
  const originX = rect.x + (rect.w - rect.w * scale) / 2;
  const originY = rect.y + (rect.h - rect.h * scale) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let row = 0; row < art.grid.length; row++) {
    const line = art.grid[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === ".") continue;
      const color = art.palette[key];
      if (color === undefined) continue;

      ctx.fillStyle = color;
      // Rounded up so neighbouring pixels never leave a seam.
      ctx.fillRect(
        originX + col * size,
        originY + row * size,
        Math.ceil(size),
        Math.ceil(size),
      );
    }
  }

  ctx.restore();
}

/** Where an item in flight sits this frame. */
function flyRect(layout: ShelfLayout, fly: Fly, columnLength: number): Rect {
  const from = itemSlot(layout, fly.fromColumn, 0);
  const to = layout.tray[fly.toSlot] ?? from;
  const p = flyProgress(fly);

  // Lift clear of the shelf first, then arc across to the tray.
  const lift = liftAmount(fly) * layout.item * 0.3;
  const arc = flyArc(fly) * layout.item * 0.85;

  void columnLength;
  // Shrink into the tray as it travels, since tray slots are smaller than shelf
  // ones — arriving at full shelf size would visibly overflow the slot.
  const size = layout.item + (layout.trayItem - layout.item) * p;
  return {
    x: from.x + (to.x - from.x) * p + (layout.item - size) / 2,
    y: from.y - lift + (to.y - (from.y - lift)) * p - arc + (layout.item - size) / 2,
    w: size,
    h: size,
  };
}

function drawShelfBoards(ctx: CanvasRenderingContext2D, layout: ShelfLayout): void {
  for (const box of layout.columns) {
    const lip = Math.max(3, layout.item * 0.12);

    ctx.fillStyle = SHELF_BOARD;
    ctx.fillRect(box.x - lip * 0.5, box.y - lip, box.w + lip, box.h + lip * 1.6);

    // A brighter lip along the bottom reads as the shelf's front edge.
    ctx.fillStyle = SHELF_EDGE;
    ctx.fillRect(box.x - lip * 0.5, box.y + box.h + lip * 0.2, box.w + lip, lip * 0.5);
  }
}

function drawTray(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  tray: number[],
): void {
  for (let i = 0; i < layout.tray.length; i++) {
    const slot = layout.tray[i];

    ctx.fillStyle = SLOT_EMPTY;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    ctx.strokeStyle = SLOT_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2);

    const type = tray[i];
    if (type !== undefined) drawItem(ctx, type, slot);
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawShelfBoards(ctx, layout);

  // While an item flies, the shelves and tray show the position it left, so the
  // item is never drawn in two places at once.
  const shown = state.fly !== null && state.before !== null ? state.before : state.shelf;
  const pulse = Math.sin(state.clock * 9) > 0;

  for (let col = 0; col < shown.columns.length; col++) {
    const column = shown.columns[col];

    for (let depth = 0; depth < column.length; depth++) {
      const type = column[column.length - 1 - depth];
      // The item in flight has already left its column.
      if (
        depth === 0 &&
        state.fly !== null &&
        state.fly.fromColumn === col
      ) {
        continue;
      }

      const rect = itemSlot(layout, col, depth);
      if (rect.y + rect.h < layout.columns[col].y - layout.item) continue;

      // Everything behind the front item is dimmed: it is visible, but locked.
      const reachable = depth === 0;
      const alpha = reachable ? 1 : Math.max(0.22, 0.55 - depth * 0.1);
      drawItem(ctx, type, rect, alpha, reachable ? 1 : 0.86);

      if (reachable && state.hinted === col && pulse) {
        ctx.strokeStyle = "#f8f0e0";
        ctx.lineWidth = 3;
        ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
      }
    }
  }

  drawTray(ctx, layout, shown.tray);

  if (state.fly !== null) {
    const column = shown.columns[state.fly.fromColumn] ?? [];
    drawItem(ctx, state.fly.type, flyRect(layout, state.fly, column.length));
  }

  // A cleared set swells and vanishes off the tray.
  if (state.pop !== null) {
    const scale = popScale(state.pop.t);
    if (scale > 0) {
      for (const slot of state.pop.slots) {
        const rect = layout.tray[slot];
        if (rect === undefined) continue;
        drawItem(ctx, state.pop.type, rect, Math.min(1, scale), scale);
      }
    }
  }
}
