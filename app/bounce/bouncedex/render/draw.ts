import { EVOLVE_FLASH_TICKS, FX_TICKS, isOverdrive, type World } from "../engine/world";
import type { Body } from "../engine/types";
import type { Vec2 } from "../engine/vec";
import { getCritter } from "@/app/game/_shared/critters";
import {
  SPRITES,
  ENEMY_SPRITE,
  BOSS_SPRITE,
  SPRITE_SIZE,
  colorFor,
  scaleColor,
  parseHex,
  type SpriteGrid,
} from "./sprites";
import {
  SPRITE_FILES,
  getSprite,
  loadSprites,
  setSpriteReadyCallback,
} from "./spriteSheet";

export interface DrawOptions {
  aimPath: Vec2[] | null;
  /** Screen-shake magnitude in pixels; 0 disables. */
  shake: number;
  reducedMotion: boolean;
}

const BG = "#141020";
const GRID = "#221b33";
const NEST = "#F8D030";
const ENEMY_BASE = "#8d5fa0";
const BOSS_BASE = "#d4506a";

/** Snap to whole pixels — sub-pixel positions blur the pixel-art look. */
const px = (n: number): number => Math.round(n);

/**
 * Rasterising 64 cells per body per frame would mean ~200k fillRect calls a
 * second. Each sprite is baked once into its own canvas and blitted instead.
 */
const spriteCache = new Map<string, HTMLCanvasElement>();

// Sprites arrive asynchronously; drop bakes made from the fallback grids so
// they are redrawn from the real artwork.
setSpriteReadyCallback(() => spriteCache.clear());

/**
 * Recolour artwork to a critter's palette while keeping the drawing's own
 * shading: dark pixels stay outline-dark, mid-tones become the critter colour
 * scaled by luminance, and eye-white is preserved unless white *is* the body.
 */
function tintInPlace(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: string,
  keepWhite: boolean,
): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const [br, bg, bb] = parseHex(base);

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const mx = Math.max(r, g, b);
    const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;

    if (lum < 0.22) {
      // The artwork's outlines are a big fraction of a 26px sprite, so keep
      // them dark enough to define the shape but not so dark they dominate.
      d[i] = br * 0.34;
      d[i + 1] = bg * 0.34;
      d[i + 2] = bb * 0.34;
    } else if (keepWhite && lum > 0.85 && sat < 0.25) {
      d[i] = 248;
      d[i + 1] = 240;
      d[i + 2] = 224;
    } else {
      const k = 0.62 + lum * 0.95;
      d[i] = Math.min(255, br * k);
      d[i + 1] = Math.min(255, bg * k);
      d[i + 2] = Math.min(255, bb * k);
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function bakeSprite(
  file: string,
  grid: SpriteGrid,
  base: string,
  diameter: number,
): HTMLCanvasElement {
  const art = getSprite(file);

  // One art pixel must be a whole number of device pixels, or the grid shimmers.
  const gridSize = art ? art.image.naturalWidth : SPRITE_SIZE;
  const cell = Math.max(1, Math.round(diameter / gridSize));
  const size = cell * gridSize;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  if (art) {
    ctx.drawImage(art.image, 0, 0, size, size);
    tintInPlace(ctx, size, base, !art.whiteIsBody);
    return canvas;
  }

  // Fallback: hand-authored grid, used until the artwork loads.
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const color = colorFor(grid[row][col], base);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  return canvas;
}

function sprite(
  key: string,
  file: string,
  grid: SpriteGrid,
  base: string,
  diameter: number,
): HTMLCanvasElement {
  const cacheKey = `${key}:${Math.round(diameter)}`;
  let baked = spriteCache.get(cacheKey);
  if (!baked) {
    baked = bakeSprite(file, grid, base, diameter);
    spriteCache.set(cacheKey, baked);
  }
  return baked;
}

/** Bake a single critter's sprite for UI use (HUD queue, Dex, modals). */
export function bakeCritterIcon(critterId: string, size: number): HTMLCanvasElement {
  loadSprites();
  const def = getCritter(critterId);
  return sprite(
    `icon:${def.id}`,
    SPRITE_FILES[def.behavior],
    SPRITES[def.behavior],
    def.color,
    size,
  );
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  opts: DrawOptions,
): void {
  loadSprites();
  const { arena } = world;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (opts.shake > 0 && !opts.reducedMotion) {
    // Deterministic wobble from the tick counter — no Math.random in render.
    const t = world.tick;
    ctx.translate(Math.sin(t * 0.9) * opts.shake, Math.cos(t * 1.3) * opts.shake);
  }

  ctx.fillStyle = BG;
  ctx.fillRect(-20, -20, arena.width + 40, arena.height + 40);

  drawGrid(ctx, arena.width, arena.height);
  if (opts.aimPath) drawAimPath(ctx, opts.aimPath);

  // Settled bumpers first so airborne critters read on top of them.
  for (const b of world.bodies) if (b.settled) drawBody(ctx, b, world.tick);
  for (const b of world.bodies) if (!b.settled) drawBody(ctx, b, world.tick);

  drawFx(ctx, world);
  drawNest(ctx, world);

  // Overdrive tints the arena so the window is unmistakable.
  if (isOverdrive(world)) {
    ctx.fillStyle = "rgba(248, 208, 48, 0.10)";
    ctx.fillRect(0, 0, arena.width, arena.height);
    ctx.strokeStyle = "#F8D030";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, arena.width - 4, arena.height - 4);
  }

  ctx.restore();
}

/** Floating numbers and kill bursts. */
function drawFx(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.save();
  ctx.textAlign = "center";

  for (const f of world.fx) {
    const t = (world.tick - f.tick) / FX_TICKS;
    if (t < 0 || t >= 1) continue;
    const rise = t * 26;
    const alpha = 1 - t * t;

    if (f.kind === "kill") {
      // Burst of four shards flying out from the corpse.
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#f8f0e0";
      const r = 4 + t * 20;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        ctx.fillRect(px(f.x + dx * r) - 2, px(f.y + dy * r) - 2, 4, 4);
      }
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      f.kind === "big" ? "#F8D030" : f.kind === "kill" ? "#ffffff" : "#d8cfe8";
    ctx.font = `bold ${f.kind === "big" ? 16 : 12}px ui-monospace, monospace`;
    ctx.fillText(String(f.value), px(f.x), px(f.y - rise));
  }

  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(px(x) + 0.5, 0);
    ctx.lineTo(px(x) + 0.5, h);
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.moveTo(0, px(y) + 0.5);
    ctx.lineTo(w, px(y) + 0.5);
  }
  ctx.stroke();
}

function drawAimPath(ctx: CanvasRenderingContext2D, path: Vec2[]): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < path.length; i++) {
    const size = i < path.length / 2 ? 4 : 3;
    ctx.fillRect(px(path[i].x) - size / 2, px(path[i].y) - size / 2, size, size);
  }
}

function blit(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
): void {
  ctx.drawImage(art, px(x - art.width / 2), px(y - art.height / 2));
}

function drawBody(ctx: CanvasRenderingContext2D, b: Body, tick: number): void {
  const diameter = b.radius * 2;

  if (b.kind === "enemy") {
    const isBoss = b.radius >= 24;
    const base = isBoss ? BOSS_BASE : ENEMY_BASE;
    blit(
      ctx,
      sprite(
        isBoss ? "boss" : "enemy",
        SPRITE_FILES.enemy,
        isBoss ? BOSS_SPRITE : ENEMY_SPRITE,
        base,
        diameter,
      ),
      b.pos.x,
      b.pos.y,
    );
    return;
  }

  if (b.critterId === null) return;
  const def = getCritter(b.critterId);

  // A settled bumper gets a bright footing so it reads as furniture rather
  // than as a shot still in flight.
  if (b.settled) {
    ctx.fillStyle = scaleColor(def.color, 0.45);
    ctx.fillRect(px(b.pos.x - b.radius), px(b.pos.y + b.radius - 2), px(diameter), 3);
  }

  blit(
    ctx,
    sprite(def.id, SPRITE_FILES[def.behavior], SPRITES[def.behavior], def.color, diameter),
    b.pos.x,
    b.pos.y,
  );

  // Evolved forms wear a crest so a boarded-up arena stays legible.
  if (def.stage === 2) {
    ctx.fillStyle = "#F8D030";
    const cw = Math.max(6, Math.round(b.radius * 0.8));
    ctx.fillRect(px(b.pos.x - cw / 2), px(b.pos.y - b.radius - 6), cw, 3);
    ctx.fillRect(px(b.pos.x - cw / 2), px(b.pos.y - b.radius - 9), 3, 3);
    ctx.fillRect(px(b.pos.x + cw / 2 - 3), px(b.pos.y - b.radius - 9), 3, 3);
  }

  drawEvolveFlash(ctx, b, tick);
}

/**
 * Most evolutions now happen silently — the branch is only *asked* once per
 * critter line, and dozens follow it automatically. Without this the player
 * sees nothing at all happen, which reads as evolution being broken.
 */
function drawEvolveFlash(ctx: CanvasRenderingContext2D, b: Body, tick: number): void {
  if (b.evolvedAtTick < 0) return;
  const age = tick - b.evolvedAtTick;
  if (age < 0 || age >= EVOLVE_FLASH_TICKS) return;

  const t = age / EVOLVE_FLASH_TICKS;

  // A white pop that fades out, in the Pokemon idiom.
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.85;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(px(b.pos.x), px(b.pos.y), b.radius * (1 + t * 0.35), 0, Math.PI * 2);
  ctx.fill();

  // Expanding ring so the moment is legible even in a crowded arena.
  ctx.globalAlpha = (1 - t) * 0.9;
  ctx.strokeStyle = "#F8D030";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px(b.pos.x), px(b.pos.y), b.radius + t * 26, 0, Math.PI * 2);
  ctx.stroke();

  // Four sparks on the diagonals.
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = "#F8D030";
  const reach = b.radius + 6 + t * 22;
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    const k = Math.SQRT1_2 * reach;
    ctx.fillRect(px(b.pos.x + dx * k) - 2, px(b.pos.y + dy * k) - 2, 4, 4);
  }
  ctx.restore();
}

function drawNest(ctx: CanvasRenderingContext2D, world: World): void {
  const { arena } = world;
  const h = 10;
  const ratio = world.maxNestHp === 0 ? 0 : world.nestHp / world.maxNestHp;

  ctx.fillStyle = "#2a2140";
  ctx.fillRect(0, arena.height - h, arena.width, h);
  ctx.fillStyle = NEST;
  ctx.fillRect(0, arena.height - h, px(arena.width * ratio), h);
}
