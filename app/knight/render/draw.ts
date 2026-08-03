import type { World } from "../engine/world";
import type { Entity } from "../engine/types";
import type { Fx } from "../engine/fx";
import { FX_TICKS } from "../engine/fx";
import { poseFor, shakeFrom } from "./anim";
import { SWING_ARC, reachOf } from "../engine/combat";
import { GRUNT } from "../data/enemies";

export interface DrawOptions {
  /** The player critter's colour, from the shared roster. */
  heroColor: string;
  reducedMotion: boolean;
}

// Contrast is load-bearing here, not decorative: the previous palette
// (BG #141020, FLOOR #1d1730, GRID #251d3a) measured 1.08:1 floor-vs-surround
// and 1.09:1 grid-vs-floor under WCAG's relative-luminance formula — both
// far below the 1.5:1 threshold where a boundary starts to read as a
// boundary at all, so the room rendered as a borderless void. These measure:
//   FLOOR vs BG     1.63:1  (target >= 1.6:1)
//   GRID  vs FLOOR  1.36:1  (target >= 1.3:1)
//   BORDER vs FLOOR 4.71:1  (target >= 2.5:1)
const BG = "#080613";
const FLOOR = "#372d5e";
const GRID = "#4c4079";
const BORDER = "#a897d0";

const px = (n: number) => Math.round(n);

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  opts: DrawOptions,
): void {
  const { arena } = world;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const shake = opts.reducedMotion ? 0 : shakeFrom(world.lastHitTick, world.tick);
  if (shake > 0) {
    // Deterministic wobble from the tick, so the renderer stays reproducible.
    // ~6Hz and ~8Hz at 120 ticks/sec. The previous multipliers (1.7 / 2.3)
    // oscillated over 30 times a second, which reads as a buzz rather than a
    // knock.
    ctx.translate(
      Math.sin(world.tick * 0.32) * shake,
      Math.cos(world.tick * 0.41) * shake,
    );
  }

  drawFloor(ctx, arena.width, arena.height);

  drawCoins(ctx, world, opts);

  drawReach(ctx, world);

  // Corpses first, so living things are never hidden behind them.
  for (const e of world.entities) if (e.deadAtTick >= 0) drawEntity(ctx, e, world, opts);
  for (const e of world.entities) if (e.deadAtTick < 0) drawEntity(ctx, e, world, opts);

  for (const f of world.fx) drawFx(ctx, f, world.tick);

  ctx.restore();
}

/**
 * The hero's swing reach, drawn as a faint ring.
 *
 * Melee range is invisible otherwise, so "why did that miss?" has no answer on
 * screen. The ring brightens once something is actually inside it, which turns
 * it from decoration into the answer to "am I close enough yet?".
 */
function drawReach(ctx: CanvasRenderingContext2D, world: World): void {
  const hero = world.entities.find((e) => e.kind === "hero" && e.deadAtTick < 0);
  if (!hero) return;

  const reach = reachOf(world);
  const armed = world.entities.some(
    (e) =>
      e.kind === "enemy" &&
      e.deadAtTick < 0 &&
      Math.hypot(e.pos.x - hero.pos.x, e.pos.y - hero.pos.y) <= reach + e.radius,
  );

  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = armed ? 2 : 1;
  ctx.strokeStyle = armed ? "rgba(248,240,224,0.5)" : "rgba(160,148,196,0.22)";
  ctx.beginPath();
  ctx.arc(px(hero.pos.x), px(hero.pos.y), reach, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Coins dropped by kills, magnetised toward the hero and banked on pickup.
 *
 * Drawn after the floor and before every entity so a coin can never sit on
 * top of the hero or a critter and hide it — the floor is the only thing a
 * coin is allowed to cover. `#F8D030` is knight's accent colour in the arcade
 * registry, so coins read as this game's gold rather than a generic pickup.
 */
function drawCoins(ctx: CanvasRenderingContext2D, world: World, opts: DrawOptions): void {
  for (const coin of world.coins) {
    // Coins read as pickup-able rather than as scenery because they bob. The
    // phase is keyed off the coin id so a pile does not pulse in unison, and
    // off world.tick (not wall-clock time) so the sim stays deterministic.
    const bob = opts.reducedMotion
      ? 0
      : Math.round(Math.sin((world.tick + coin.id * 17) * 0.08));
    ctx.fillStyle = "#F8D030";
    ctx.fillRect(px(coin.pos.x) - 2, px(coin.pos.y) - 2 + bob, 5, 5);
    ctx.fillStyle = "#FFF3B0";
    ctx.fillRect(px(coin.pos.x) - 2, px(coin.pos.y) - 2 + bob, 5, 1);
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(-40, -40, w + 80, h + 80);

  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, w, h);

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

  // Walls read as a border so the play area has an edge.
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
  opts: DrawOptions,
): void {
  const pose = poseFor(e, world.tick);
  const base = e.kind === "hero" ? opts.heroColor : GRUNT.color;
  const r = e.radius;

  ctx.save();
  ctx.translate(px(e.pos.x + pose.offsetX), px(e.pos.y + pose.offsetY));
  ctx.rotate(pose.tilt);
  ctx.scale(pose.scaleX, pose.scaleY);

  // Contact shadow keeps entities planted on the floor.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes, offset toward facing, so the entity reads as looking where it moves.
  ctx.fillStyle = "#f8f0e0";
  const ex = e.facing.x * r * 0.22;
  const ey = e.facing.y * r * 0.16;
  ctx.fillRect(px(-r * 0.42 + ex), px(-r * 0.2 + ey), 4, 5);
  ctx.fillRect(px(r * 0.18 + ex), px(-r * 0.2 + ey), 4, 5);

  if (pose.flash > 0) {
    ctx.globalAlpha = pose.flash;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Health pip. The hero gets one too: the HUD hearts are at the top of the
  // screen, but your eyes are on your critter during a fight, so damage needs
  // to read where the action is.
  if (e.kind === "hero" && e.deadAtTick < 0) {
    const w = r * 2;
    const ratio = e.maxHp === 0 ? 0 : Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "#2a2140";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 9), w, 4);
    ctx.fillStyle = ratio > 0.34 ? "#6ee06e" : "#e05050";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 9), px(w * ratio), 4);
  }

  if (e.kind === "enemy" && e.deadAtTick < 0 && e.hp < e.maxHp) {
    const w = r * 2;
    ctx.fillStyle = "#2a2140";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 8), w, 3);
    ctx.fillStyle = "#e05050";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 8), w * Math.max(0, e.hp / e.maxHp), 3);
  }
}

function drawFx(ctx: CanvasRenderingContext2D, f: Fx, tick: number): void {
  const t = (tick - f.tick) / FX_TICKS;
  if (t < 0 || t >= 1) return;
  const alpha = 1 - t;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (f.kind === "slash") {
    // An arc sweeping through the swing wedge, widening as it fades.
    ctx.strokeStyle = "#f8f0e0";
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.reach * (0.5 + t * 0.5), f.angle - SWING_ARC / 2, f.angle + SWING_ARC / 2);
    ctx.stroke();
  } else if (f.kind === "impact") {
    ctx.fillStyle = "#F8D030";
    const reach = 6 + t * 16;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      ctx.fillRect(px(f.x + dx * reach) - 2, px(f.y + dy * reach) - 2, 4, 4);
    }
  } else {
    // Death: eight shards flying out.
    ctx.fillStyle = "#ffffff";
    const reach = 4 + t * 28;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillRect(px(f.x + Math.cos(a) * reach) - 2, px(f.y + Math.sin(a) * reach) - 2, 4, 4);
    }
  }

  ctx.restore();
}
