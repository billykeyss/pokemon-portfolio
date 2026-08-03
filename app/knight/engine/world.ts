import type { Arena, Entity, Vec2 } from "./types";
import { steerHero } from "./move";
import type { SwingHit } from "./combat";
import { updateAttack, reachOf, IFRAME_TICKS, ENEMY_IFRAME_TICKS } from "./combat";
import { steerEnemy, applyTouchDamage } from "./ai";
import { GRUNT } from "../data/enemies";
import type { Fx } from "./fx";
import { pushFx, expireFx } from "./fx";
import { HERO_RADIUS, ENEMY_RADIUS } from "./constants";
import { statsOf } from "./stats";
import { defaultMods, type RunMods } from "../data/upgrades";
import type { Coin } from "./coins";
import { dropCoins, updateCoins } from "./coins";

/** Re-exported so existing importers of `RunMods` from `world.ts` still work;
 *  the type itself now lives in `../data/upgrades` alongside the catalogue
 *  that produces values of it. */
export type { RunMods };

/** Simulation runs at a fixed 120Hz regardless of render frame rate. */
export const FIXED_DT = 1 / 120;

/** How long a corpse lingers so its death can animate, in ticks. */
export const CORPSE_TICKS = 36;

/** Coins a kill drops, before the run's coinMult scales it. Flat for every
 *  archetype until phase 3's monster table gives each its own value. Set so
 *  clearing level one (2 grunts) yields exactly one Long Arm's worth of
 *  coins — the first shop must be a real decision, not a shrug. */
const COIN_VALUE = 5;

export interface World {
  tick: number;
  arena: Arena;
  entities: Entity[];
  nextId: number;
  rngSeed: number;
  over: boolean;
  /** Where the thumb is dragging the hero, in arena space, or null. */
  moveTarget: Vec2 | null;
  mods: RunMods;
  /** Swing hits produced by the most recent step; the renderer drains this. */
  hits: SwingHit[];
  /** Short-lived visual effects. Owned by the sim so they survive the gap
   *  between simulation steps and render frames. */
  fx: Fx[];
  /** Tick of the most recent damaging hit, for screen shake. */
  lastHitTick: number;
  /** Coins currently on the floor, mid-flight to the hero or waiting for a sweep. */
  coins: Coin[];
  /** Coins banked so far this run. */
  purse: number;
}

export function createWorld(opts: { arena: Arena; seed: number }): World {
  return {
    tick: 0,
    arena: opts.arena,
    entities: [],
    nextId: 1,
    rngSeed: opts.seed,
    over: false,
    moveTarget: null,
    mods: defaultMods(),
    hits: [],
    fx: [],
    lastHitTick: -1,
    coins: [],
    purse: 0,
  };
}

function baseEntity(world: World, kind: Entity["kind"], pos: Vec2, radius: number, hp: number): Entity {
  const iframeTicks = kind === "hero" ? IFRAME_TICKS : ENEMY_IFRAME_TICKS;
  const e: Entity = {
    id: world.nextId++,
    kind,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius,
    hp,
    maxHp: hp,
    facing: { x: 0, y: 1 },
    hitAtTick: -1,
    iframeTicks,
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0, targetId: -1 },
  };
  world.entities.push(e);
  return e;
}

export function spawnHero(world: World, pos: Vec2): Entity {
  const s = statsOf(world);
  const hero = baseEntity(world, "hero", pos, HERO_RADIUS, s.maxHp);
  hero.iframeTicks = s.iframeTicks;
  return hero;
}

export function spawnEnemy(world: World, pos: Vec2, hp: number): Entity {
  return baseEntity(world, "enemy", pos, ENEMY_RADIUS, hp);
}

export function heroOf(world: World): Entity | null {
  return world.entities.find((e) => e.kind === "hero") ?? null;
}

/** Keep an entity inside the room. Positions are clamped, never wrapped. */
function clampToArena(e: Entity, arena: Arena): void {
  e.pos.x = Math.max(e.radius, Math.min(arena.width - e.radius, e.pos.x));
  e.pos.y = Math.max(e.radius, Math.min(arena.height - e.radius, e.pos.y));
}

/**
 * Advance the world by exactly one FIXED_DT. Mutates in place.
 * Later tasks insert steering, combat and AI into this function; the order is
 * intentional and documented where each is added.
 */
export function stepWorld(world: World): void {
  if (world.over) return;

  const steering = heroOf(world);
  if (steering && steering.deadAtTick < 0) {
    steerHero(world, steering, world.moveTarget, FIXED_DT);
  }

  for (const e of world.entities) {
    if (e.kind === "enemy") steerEnemy(world, e, GRUNT, FIXED_DT);
  }
  applyTouchDamage(world, GRUNT);

  world.hits.length = 0;
  for (const e of world.entities) {
    // Slice 1 enemies harm the hero by contact only (applyTouchDamage,
    // above, already gated by i-frames). Swinging is reserved for the hero:
    // SWING_DAMAGE and HERO_HP are different units in disguise — hit points
    // for enemies, hearts for the hero — so an enemy swing landing
    // SWING_DAMAGE through the same damageEntity used to one-shot a
    // full-health hero. Enemy swinging was never specified for slice 1; it
    // was an accident of running updateAttack over every entity. Enemies get
    // their own attack, and their own damage unit, when weapons and armor
    // arrive in slice 3.
    if (e.kind !== "hero") continue;
    const swings = updateAttack(world, e);
    if (e.attack.phase === "active" && world.tick === e.attack.startedAtTick) {
      pushFx(world, {
        kind: "slash",
        x: e.pos.x + e.facing.x * 18,
        y: e.pos.y + e.facing.y * 18,
        angle: Math.atan2(e.facing.y, e.facing.x),
        reach: reachOf(world),
        tick: world.tick,
      });
    }
    for (const hit of swings) {
      const target = world.entities.find((t) => t.id === hit.targetId);
      if (!target) continue;
      if (hit.killed) dropCoins(world, target.pos, COIN_VALUE);
      pushFx(world, {
        kind: hit.killed ? "death" : "impact",
        x: target.pos.x,
        y: target.pos.y,
        angle: 0,
        reach: 0,
        tick: world.tick,
      });
      world.lastHitTick = world.tick;
    }
    world.hits.push(...swings);
  }

  for (const e of world.entities) {
    if (e.deadAtTick >= 0) continue;
    e.pos.x += e.vel.x * FIXED_DT;
    e.pos.y += e.vel.y * FIXED_DT;
    clampToArena(e, world.arena);
  }

  // Corpses linger so death can animate, then leave.
  world.entities = world.entities.filter(
    (e) => e.deadAtTick < 0 || world.tick - e.deadAtTick < CORPSE_TICKS,
  );

  const hero = heroOf(world);
  if (hero && hero.hp <= 0 && hero.deadAtTick < 0) {
    hero.deadAtTick = world.tick;
  }
  if (!hero || hero.hp <= 0) world.over = true;

  updateCoins(world, FIXED_DT);
  expireFx(world);
  world.tick += 1;
}
