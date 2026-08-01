import { drawPixelGrid } from "@/app/game/_shared/pixelGrid";
import type { SpriteMap } from "@/app/game/_shared/useSprites";
import { flyArc, flyProgress, liftAmount, popScale, type Fly } from "../engine/anim";
import { fallbackArt, goodAt } from "../engine/items";
import { frontOf } from "../engine/rules";
import { SHELF_WIDTH, type Board } from "../engine/types";
import { slotRect, type Rect, type ShelfLayout } from "./layout";
import { librarianAt, librarianSprite } from "./librarian";
import { buntingRow, buntingSag, moteAt, moteField } from "./scenery";

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

const BG_TOP = "#2E2136";
const BG_BOTTOM = "#191223";
const WALLPAPER = "rgba(255, 236, 200, 0.032)";
const LAMP = "#F7DFA8";
const STRING = "rgba(255, 236, 200, 0.25)";
const FRAME = "#7A5433";
const FRAME_LIP = "#9A6D45";
const FRAME_DARK = "#4E331E";
const FLOOR = "#3A2A22";
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

const MOTES = moteField(38);
const BUNTING = buntingRow(9);

/**
 * Draw a good, preferring its sprite and falling back to the hand-drawn grid.
 *
 * The fallback is not decoration: a sprite that has not arrived yet — or at
 * all — would otherwise leave an empty slot on a board whose entire mechanic is
 * comparing what is in the slots.
 */
function drawItem(
  ctx: CanvasRenderingContext2D,
  type: number,
  rect: Rect,
  sprites: SpriteMap,
  alpha = 1,
  scale = 1,
): void {
  const w = rect.w * scale;
  const h = rect.h * scale;
  const x = rect.x + (rect.w - w) / 2;
  const y = rect.y + (rect.h - h) / 2;

  const sprite = sprites[goodAt(type).sprite];
  if (sprite !== undefined) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // Sprites are 16x16 pixel art; smoothing turns them to mush when scaled up.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, x, y, w, h);
    ctx.restore();
    return;
  }

  const art = fallbackArt(type);
  drawPixelGrid(ctx, { grid: art.grid, palette: art.palette }, { x, y, w, h }, alpha);
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
  sprites: SpriteMap,
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
      sprites,
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

/** Papered wall, a warm pool of lamplight, bunting and drifting dust. */
function drawShop(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  clock: number,
  canvasW: number,
  canvasH: number,
): void {
  const wall = ctx.createLinearGradient(0, 0, 0, canvasH);
  wall.addColorStop(0, BG_TOP);
  wall.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Wallpaper stripes, barely there — enough to stop the wall reading as a void.
  ctx.fillStyle = WALLPAPER;
  const stripe = canvasW / 14;
  for (let x = 0; x < canvasW; x += stripe * 2) ctx.fillRect(x, 0, stripe, canvasH);

  // A pool of lamplight from above, which is what the dust is catching.
  const lamp = ctx.createRadialGradient(
    canvasW / 2, -canvasH * 0.1, canvasW * 0.05,
    canvasW / 2, canvasH * 0.35, canvasH * 0.85,
  );
  lamp.addColorStop(0, "rgba(247, 223, 168, 0.16)");
  lamp.addColorStop(1, "rgba(247, 223, 168, 0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Bunting across the top.
  const spanY = canvasH * 0.035;
  const sagMax = canvasH * 0.03;
  ctx.strokeStyle = STRING;
  ctx.lineWidth = Math.max(1, canvasW * 0.003);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = spanY + buntingSag(t, clock) * sagMax;
    if (i === 0) ctx.moveTo(0, y);
    else ctx.lineTo(t * canvasW, y);
  }
  ctx.stroke();

  const flagH = canvasH * 0.028;
  const flagW = canvasW * 0.028;
  for (const flag of BUNTING) {
    const x = flag.t * canvasW;
    const y = spanY + buntingSag(flag.t, clock) * sagMax;
    ctx.fillStyle = flag.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(x - flagW / 2, y);
    ctx.lineTo(x + flagW / 2, y);
    ctx.lineTo(x, y + flagH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Floorboards under the cabinets.
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, layout.floorY, canvasW, canvasH - layout.floorY);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvasW; x += canvasW / 7) {
    ctx.beginPath();
    ctx.moveTo(x, layout.floorY);
    ctx.lineTo(x, canvasH);
    ctx.stroke();
  }

  ctx.save();
  for (const mote of MOTES) {
    const { x, y, r } = moteAt(mote, clock, canvasW, canvasH);
    ctx.globalAlpha = mote.alpha;
    ctx.fillStyle = LAMP;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The wooden carcass each column of shelves sits inside. */
function drawCabinets(ctx: CanvasRenderingContext2D, layout: ShelfLayout): void {
  const post = Math.max(4, layout.item * 0.16);

  for (const box of layout.cabinets) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(box.x + post * 0.5, box.y + post * 0.6, box.w, box.h);

    // Side posts and a top rail, so the shelves read as one piece of furniture.
    ctx.fillStyle = FRAME;
    ctx.fillRect(box.x - post, box.y - post, post, box.h + post * 2);
    ctx.fillRect(box.x + box.w, box.y - post, post, box.h + post * 2);
    ctx.fillRect(box.x - post, box.y - post, box.w + post * 2, post);
    ctx.fillRect(box.x - post, box.y + box.h, box.w + post * 2, post);

    ctx.fillStyle = FRAME_LIP;
    ctx.fillRect(box.x - post, box.y - post, box.w + post * 2, post * 0.3);
    ctx.fillRect(box.x - post, box.y - post, post * 0.3, box.h + post * 2);

    ctx.fillStyle = FRAME_DARK;
    ctx.fillRect(box.x + box.w + post * 0.7, box.y - post, post * 0.3, box.h + post * 2);
  }
}

/**
 * The librarian pacing the floor.
 *
 * Sized against the floor band rather than against a shelf item: measured from
 * the item she is half again as tall as a good, which puts her head inside the
 * bottom cabinet. The floor is the space she actually has, so it is the space
 * she is fitted to.
 */
function drawLibrarian(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  clock: number,
  canvasW: number,
  canvasH: number,
): void {
  const band = canvasH - layout.floorY;
  if (band <= 0) return;

  const pose = librarianAt(clock);
  const h = Math.min(layout.item * 1.6, band * 0.66);
  const w = h * (10 / 12);

  const margin = canvasW * 0.08;
  const x = margin + pose.x * (canvasW - margin * 2 - w);
  // Feet planted a little way down the boards, so she stands on the floor
  // rather than on the line where it starts.
  const y = layout.floorY + band * 0.82 - h + pose.bob * layout.item * 0.06;

  ctx.save();
  if (pose.flipped) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
  }
  drawPixelGrid(ctx, librarianSprite(pose.pose), { x, y, w, h });
  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: ShelfLayout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
  sprites: SpriteMap,
): void {
  drawShop(ctx, layout, state.clock, canvasW, canvasH);
  drawCabinets(ctx, layout);
  drawLibrarian(ctx, layout, state.clock, canvasW, canvasH);

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

      drawSlot(ctx, layout, rect, stack, inFlight, sprites);

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
    drawItem(ctx, state.fly.type, flyRect(layout, state.fly), sprites);
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
          sprites,
          Math.min(1, scale),
          scale,
        );
      }
    }
  }
}
