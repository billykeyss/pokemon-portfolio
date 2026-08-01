import type { SpriteMap } from "@/app/game/_shared/useSprites";
import { exitOffset, slideProgress, type Slide } from "../engine/anim";
import { PLAYER_ID, type Board, type Vehicle } from "../engine/types";
import { cellRect, vehicleRect, type Layout, type Rect } from "./layout";

export interface DrawState {
  board: Board;
  slide: Slide | null;
  /** Non-null once the player has won and the car is driving out. */
  exitT: number | null;
  selected: number | null;
  hinted: number | null;
  clock: number;
}

const BG = "#0d0a15";
const ASPHALT = "#241d33";
const LINE = "rgba(248, 240, 224, 0.10)";
const WALL = "#f8f0e0";
const EXIT_GLOW = "#78C850";

/**
 * Sprite files are portrait, nose up. A vertical vehicle uses one as-is; a
 * horizontal one is the same art rotated, which is why only five car images
 * cover both orientations.
 */
export const SPRITE_NAMES = [
  "car-red",
  "car-blue",
  "car-green",
  "car-yellow",
  "car-purple",
] as const;

/** Body colours for vehicles with no sprite — the trucks, today. */
const BODY = ["#E03A3A", "#3B82F6", "#4ADE58", "#FACC15", "#A855F7"];

export function spriteSources(): Record<string, string> {
  return Object.fromEntries(
    SPRITE_NAMES.map((name) => [name, `/game/traffic/${name}.png`]),
  );
}

function spriteFor(vehicle: Vehicle, sprites: SpriteMap): HTMLImageElement | undefined {
  // Only two-cell vehicles have art; trucks fall through to the drawn version.
  if (vehicle.len !== 2) return undefined;
  return sprites[SPRITE_NAMES[vehicle.kind % SPRITE_NAMES.length]];
}

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(r.x + radius, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, radius);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, radius);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, radius);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, radius);
  ctx.closePath();
}

/**
 * Drawn stand-in for a vehicle with no sprite. Deliberately reads as a boxy
 * truck rather than as a broken car: the three-cell vehicles genuinely are a
 * different kind of thing, so looking different is correct.
 */
function drawTruck(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  vehicle: Vehicle,
  inset: number,
): void {
  const body: Rect = {
    x: rect.x + inset,
    y: rect.y + inset,
    w: rect.w - inset * 2,
    h: rect.h - inset * 2,
  };
  const color = BODY[vehicle.kind % BODY.length];

  ctx.fillStyle = color;
  roundRect(ctx, body, Math.min(body.w, body.h) * 0.18);
  ctx.fill();

  ctx.lineWidth = Math.max(2, inset * 0.9);
  ctx.strokeStyle = "#12101c";
  ctx.stroke();

  // Cab at the leading end, then a cargo box behind it.
  const cabDepth = (vehicle.horizontal ? body.w : body.h) * 0.3;
  const cab: Rect = vehicle.horizontal
    ? { x: body.x + body.w - cabDepth, y: body.y, w: cabDepth, h: body.h }
    : { x: body.x, y: body.y, w: body.w, h: cabDepth };

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  roundRect(
    ctx,
    {
      x: cab.x + body.w * 0.06,
      y: cab.y + body.h * 0.06,
      w: cab.w - body.w * 0.12,
      h: cab.h - body.h * 0.12,
    },
    Math.min(cab.w, cab.h) * 0.2,
  );
  ctx.fill();

  // Slats along the cargo box so it does not read as a flat slab.
  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = Math.max(1, inset * 0.5);
  const slats = 3;
  for (let i = 1; i < slats; i++) {
    const f = i / slats;
    ctx.beginPath();
    if (vehicle.horizontal) {
      const x = body.x + (body.w - cabDepth) * f;
      ctx.moveTo(x, body.y + body.h * 0.2);
      ctx.lineTo(x, body.y + body.h * 0.8);
    } else {
      const y = body.y + cabDepth + (body.h - cabDepth) * f;
      ctx.moveTo(body.x + body.w * 0.2, y);
      ctx.lineTo(body.x + body.w * 0.8, y);
    }
    ctx.stroke();
  }
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  vehicle: Vehicle,
  offset: number,
  sprites: SpriteMap,
  highlight: boolean,
): void {
  const rect = vehicleRect(layout, vehicle, offset);
  const inset = Math.max(2, layout.cell * 0.07);
  const sprite = spriteFor(vehicle, sprites);

  if (highlight) {
    ctx.save();
    ctx.shadowColor = "rgba(248, 240, 224, 0.85)";
    ctx.shadowBlur = layout.cell * 0.35;
  }

  if (sprite === undefined) {
    drawTruck(ctx, rect, vehicle, inset);
  } else {
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);

    if (vehicle.horizontal) {
      // The art is portrait; a quarter turn points its nose along the row.
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(
        sprite,
        -(rect.h - inset * 2) / 2,
        -(rect.w - inset) / 2,
        rect.h - inset * 2,
        rect.w - inset,
      );
    } else {
      ctx.drawImage(
        sprite,
        -(rect.w - inset * 2) / 2,
        -(rect.h - inset) / 2,
        rect.w - inset * 2,
        rect.h - inset,
      );
    }

    ctx.restore();
  }

  if (highlight) ctx.restore();
}

function drawBoard(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const board = layout.cell * layout.size;

  ctx.fillStyle = ASPHALT;
  ctx.fillRect(layout.originX, layout.originY, board, board);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (let i = 1; i < layout.size; i++) {
    const at = i * layout.cell;
    ctx.beginPath();
    ctx.moveTo(layout.originX + at, layout.originY);
    ctx.lineTo(layout.originX + at, layout.originY + board);
    ctx.moveTo(layout.originX, layout.originY + at);
    ctx.lineTo(layout.originX + board, layout.originY + at);
    ctx.stroke();
  }

  // Walls, broken on the right at the exit row.
  const exit = cellRect(layout, layout.exitRow, layout.size - 1);
  ctx.fillStyle = WALL;
  ctx.fillRect(layout.originX - layout.wall, layout.originY - layout.wall, board + layout.wall * 2, layout.wall);
  ctx.fillRect(layout.originX - layout.wall, layout.originY + board, board + layout.wall * 2, layout.wall);
  ctx.fillRect(layout.originX - layout.wall, layout.originY, layout.wall, board);
  ctx.fillRect(layout.originX + board, layout.originY, layout.wall, exit.y - layout.originY);
  ctx.fillRect(
    layout.originX + board,
    exit.y + exit.h,
    layout.wall,
    layout.originY + board - (exit.y + exit.h),
  );

  // Exit lane, so where the car is headed is unmistakable.
  ctx.fillStyle = EXIT_GLOW;
  ctx.fillRect(layout.originX + board, exit.y + exit.h * 0.42, layout.wall * 2.2, exit.h * 0.16);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
  sprites: SpriteMap,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawBoard(ctx, layout);

  const sliding = state.slide;
  const pulse = Math.sin(state.clock * 9) > 0;

  for (const vehicle of state.board.vehicles) {
    let offset = 0;

    if (sliding !== null && sliding.move.id === vehicle.id) {
      // The board already holds the post-move position, so the animation walks
      // backwards from where the vehicle came.
      offset = -sliding.move.delta * (1 - slideProgress(sliding));
    }
    if (state.exitT !== null && vehicle.id === PLAYER_ID) {
      offset += exitOffset(state.exitT, layout.size);
    }

    const highlight =
      state.selected === vehicle.id || (state.hinted === vehicle.id && pulse);

    drawVehicle(ctx, layout, vehicle, offset, sprites, highlight);
  }
}
