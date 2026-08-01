import { drawPixelGrid } from "@/app/game/_shared/pixelGrid";
import { flyArc, flyProgress, liftAmount, popScale, type Fly } from "../engine/anim";
import { itemAt } from "../engine/items";
import { frontOf } from "../engine/rules";
import { SHELF_WIDTH, type Board } from "../engine/types";
import { slotRect, type Rect, type ShelfLayout } from "./layout";

export interface Pop {
  shelf: number;
  type: number;
  t: number;
}

export interface DrawState {
  board: Board;
  /** Pre-move snapshot; non-null only while an item is in flight. */
  before: Board | null;
  fly: Fly | null;
  pop: Pop | null;
  selected: { shelf: number; slot: number } | null;
  hintedShelf: number | null;
  clock: number;
}

const BG_TOP = "#241a2e";
const BG_BOTTOM = "#150f1d";
const WOOD = "#6B4A2F";
const WOOD_LIP = "#8A6340";
const WOOD_SHADE = "#4A3220";
const BACKBOARD = "rgba(255, 255, 255, 0.035)";
const SLOT_EDGE = "rgba(255, 255, 255, 0.09)";
const SELECT = "#F7D96B";

/**
 * How far a buried item peeks out from behind the one in front of it.
 *
 * Sized so the shape behind is identifiable, not merely present. Knowing that
 * *something* is buried is not a decision the player can act on; knowing it is
 * the third apple is the whole point of being able to see it at all.
 */
const DEPTH_OFFSET = 0.34;

function drawItem(
  ctx: CanvasRenderingContext2D,
  type: number,
  rect: Rect,
  alpha = 1,
  scale = 1,
): void {
  const art = itemAt(type);
  const w = rect.w * scale;
  const h = rect.h * scale;

  drawPixelGrid(
    ctx,
    { grid: art.grid, palette: art.palette },
    { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h },
    alpha,
  );
}

/**
 * One slot's stack, back to front.
 *
 * Buried items are drawn smaller, dimmer and offset up so they read as sitting
 * further back on the shelf — the player can see what is coming without being
 * able to reach it, which is the whole tension of the board.
 */
function drawSlot(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  rect: Rect,
  stack: number[],
  skipFront: boolean,
): void {
  ctx.fillStyle = BACKBOARD;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = SLOT_EDGE;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

  const top = stack.length - 1;
  for (let i = 0; i < stack.length; i++) {
    const depth = top - i;
    if (depth === 0 && skipFront) continue;

    const back = depth > 0;
    const shrink = back ? Math.max(0.68, 1 - depth * 0.14) : 1;
    const lift = back ? layout.item * DEPTH_OFFSET * Math.min(depth, 2) : 0;

    drawItem(
      ctx,
      stack[i],
      { x: rect.x, y: rect.y - lift, w: rect.w, h: rect.h },
      back ? Math.max(0.3, 0.62 - (depth - 1) * 0.14) : 1,
      shrink,
    );
  }
}

/** The wooden plank a shelf's goods stand on. */
function drawPlank(ctx: CanvasRenderingContext2D, layout: ShelfLayout, shelf: number): void {
  const box = layout.shelves[shelf];
  const overhang = layout.item * 0.35;
  const x = box.x - overhang;
  const w = box.w + overhang * 2;
  const y = box.y + box.h;

  ctx.fillStyle = WOOD;
  ctx.fillRect(x, y, w, layout.plank);
  ctx.fillStyle = WOOD_LIP;
  ctx.fillRect(x, y, w, Math.max(1, layout.plank * 0.3));
  ctx.fillStyle = WOOD_SHADE;
  ctx.fillRect(x, y + layout.plank, w, Math.max(1, layout.plank * 0.35));
}

/** Where an item in flight sits this frame. */
function flyRect(layout: ShelfLayout, fly: Fly): Rect {
  const from = slotRect(layout, fly.from.shelf, fly.from.slot);
  const to = slotRect(layout, fly.to.shelf, fly.to.slot);
  const p = flyProgress(fly);

  const lift = liftAmount(fly) * layout.item * 0.35;
  const arc = flyArc(fly) * layout.item * 0.75;

  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y - lift + (to.y - (from.y - lift)) * p - arc,
    w: layout.item,
    h: layout.item,
  };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, canvasH);
  sky.addColorStop(0, BG_TOP);
  sky.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // While an item flies, the shelves show the arrangement it left, so it is
  // never drawn in two places at once.
  const shown = state.fly !== null && state.before !== null ? state.before : state.board;
  const pulse = Math.sin(state.clock * 9) > 0;

  for (let shelf = 0; shelf < layout.shelves.length; shelf++) {
    drawPlank(ctx, layout, shelf);

    const highlight = state.hintedShelf === shelf && pulse;
    if (highlight) {
      const box = layout.shelves[shelf];
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = Math.max(2, layout.item * 0.05);
      ctx.strokeRect(
        box.x - layout.item * 0.12,
        box.y - layout.item * 0.12,
        box.w + layout.item * 0.24,
        box.h + layout.item * 0.24,
      );
    }

    for (let slot = 0; slot < SHELF_WIDTH; slot++) {
      const stack = shown.shelves[shelf]?.[slot] ?? [];
      const rect = slotRect(layout, shelf, slot);

      const inFlight =
        state.fly !== null &&
        state.fly.from.shelf === shelf &&
        state.fly.from.slot === slot;

      drawSlot(ctx, layout, rect, stack, inFlight);

      const chosen =
        state.selected !== null &&
        state.selected.shelf === shelf &&
        state.selected.slot === slot;

      if (chosen && frontOf(stack) !== null) {
        ctx.strokeStyle = SELECT;
        ctx.lineWidth = Math.max(2, layout.item * 0.06);
        ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
      }
    }
  }

  if (state.fly !== null) {
    drawItem(ctx, state.fly.type, flyRect(layout, state.fly));
  }

  // A cleared shelf swells and vanishes.
  if (state.pop !== null) {
    const scale = popScale(state.pop.t);
    if (scale > 0) {
      for (let slot = 0; slot < SHELF_WIDTH; slot++) {
        drawItem(
          ctx,
          state.pop.type,
          slotRect(layout, state.pop.shelf, slot),
          Math.min(1, scale),
          scale,
        );
      }
    }
  }
}
