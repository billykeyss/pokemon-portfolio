import { drawPixelGrid } from "@/app/game/_shared/pixelGrid";
import type { SpriteMap } from "@/app/game/_shared/useSprites";
import { exitOffset, slideProgress, type Slide } from "../engine/anim";
import { PLAYER_ID, type Board, type Vehicle } from "../engine/types";
import { cellRect, vehicleRect, type Layout } from "./layout";
import { truckSprite } from "./truck";

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
const CAR_NAMES = [
  "car-red",
  "car-blue",
  "car-green",
  "car-yellow",
  "car-purple",
] as const;

/**
 * Trucks are their own set because a vehicle's length is the thing a player
 * reads first, and art that scales a car to three cells reads as a stretched
 * car rather than a different vehicle.
 */
const TRUCK_NAMES = ["truck-white", "truck-silver"] as const;

export const SPRITE_NAMES = [...CAR_NAMES, ...TRUCK_NAMES] as const;

/** Body colours for the drawn fallback, used until the art has loaded. */
const BODY = ["#E03A3A", "#3B82F6", "#4ADE58", "#FACC15", "#A855F7"];

export function spriteSources(): Record<string, string> {
  return Object.fromEntries(
    SPRITE_NAMES.map((name) => [name, `/game/traffic/${name}.png`]),
  );
}

function spriteFor(vehicle: Vehicle, sprites: SpriteMap): HTMLImageElement | undefined {
  // Length picks the set, so a three-cell vehicle is always drawn as a truck.
  // Anything not yet loaded returns undefined and falls back to the drawn grid.
  const names = vehicle.len === 2 ? CAR_NAMES : TRUCK_NAMES;
  return sprites[names[vehicle.kind % names.length]];
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

  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);

  // Both the photographed cars and the drawn truck are portrait, nose up, so a
  // single quarter turn serves either in a horizontal lane.
  if (vehicle.horizontal) ctx.rotate(Math.PI / 2);
  const w = (vehicle.horizontal ? rect.h : rect.w) - inset * 2;
  const h = (vehicle.horizontal ? rect.w : rect.h) - inset;

  if (sprite === undefined) {
    drawPixelGrid(
      ctx,
      truckSprite(BODY[vehicle.kind % BODY.length]),
      { x: -w / 2, y: -h / 2, w, h },
    );
  } else {
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  }

  ctx.restore();
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
