import type { Arena, Entity, Vec2 } from "./types";
import { steerHero } from "./move";
import type { SwingHit } from "./combat";
import { updateAttack } from "./combat";
import { steerEnemy, applyTouchDamage } from "./ai";
import { GRUNT } from "../data/enemies";
import type { Fx } from "./fx";
import { pushFx, expireFx } from "./fx";

/** Simulation runs at a fixed 120Hz regardless of render frame rate. */
export const FIXED_DT = 1 / 120;

/** How long a corpse lingers so its death can animate, in ticks. */
export const CORPSE_TICKS = 36;

const HERO_RADIUS = 12;
const HERO_HP = 5;
const ENEMY_RADIUS = 11;

export interface World {
  tick: number;
  arena: Arena;
  entities: Entity[];
  nextId: number;
  rngSeed: number;
  over: boolean;
  /** Where the thumb is dragging the hero, in arena space, or null. */
  moveTarget: Vec2 | null;
  /** Swing hits produced by the most recent step; the renderer drains this. */
  hits: SwingHit[];
  /** Short-lived visual effects. Owned by the sim so they survive the gap
   *  between simulation steps and render frames. */
  fx: Fx[];
  /** Tick of the most recent damaging hit, for screen shake. */
  lastHitTick: number;
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
    hits: [],
    fx: [],
    lastHitTick: -1,
  };
}

function baseEntity(world: World, kind: Entity["kind"], pos: Vec2, radius: number, hp: number): Entity {
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
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0 },
  };
  world.entities.push(e);
  return e;
}

export function spawnHero(world: World, pos: Vec2): Entity {
  return baseEntity(world, "hero", pos, HERO_RADIUS, HERO_HP);
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
    steerHero(steering, world.moveTarget, FIXED_DT);
  }

  for (const e of world.entities) {
    if (e.kind === "enemy") steerEnemy(world, e, GRUNT, FIXED_DT);
  }
  applyTouchDamage(world, GRUNT);

  world.hits.length = 0;
  for (const e of world.entities) {
    const swings = updateAttack(world, e);
    if (e.attack.phase === "active" && world.tick === e.attack.startedAtTick) {
      pushFx(world, {
        kind: "slash",
        x: e.pos.x + e.facing.x * 18,
        y: e.pos.y + e.facing.y * 18,
        angle: Math.atan2(e.facing.y, e.facing.x),
        tick: world.tick,
      });
    }
    for (const hit of swings) {
      const target = world.entities.find((t) => t.id === hit.targetId);
      if (!target) continue;
      pushFx(world, {
        kind: hit.killed ? "death" : "impact",
        x: target.pos.x,
        y: target.pos.y,
        angle: 0,
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

  expireFx(world);
  world.tick += 1;
}
