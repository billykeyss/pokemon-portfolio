import type { Entity } from "./types";
import type { World } from "./world";
import { heroOf } from "./world";
import { damageEntity, CONTACT_KNOCKBACK } from "./combat";
import { pushFx } from "./fx";
import type { EnemyDef } from "../data/enemies";

/** How fast an enemy's velocity converges, per second. Lower than the hero's,
 *  so enemies read as lumbering and can be kited. */
export const ENEMY_ACCEL = 9;

/** Walk toward the hero. Slice 1 keeps this deliberately plain — the point of
 *  the slice is whether swinging feels good, not whether the AI is clever. */
export function steerEnemy(
  world: World,
  e: Entity,
  def: EnemyDef,
  dt: number,
): void {
  if (e.deadAtTick >= 0) return;

  const hero = heroOf(world);
  let desiredX = 0;
  let desiredY = 0;

  if (hero && hero.deadAtTick < 0) {
    const dx = hero.pos.x - e.pos.x;
    const dy = hero.pos.y - e.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      desiredX = (dx / dist) * def.speed;
      desiredY = (dy / dist) * def.speed;
      e.facing.x = dx / dist;
      e.facing.y = dy / dist;
    }
  }

  const k = 1 - Math.exp(-ENEMY_ACCEL * dt);
  e.vel.x += (desiredX - e.vel.x) * k;
  e.vel.y += (desiredY - e.vel.y) * k;
}

/** Enemies hurt the hero by touching them. */
export function applyTouchDamage(world: World, def: EnemyDef): void {
  const hero = heroOf(world);
  if (!hero || hero.deadAtTick >= 0) return;

  for (const e of world.entities) {
    if (e.kind !== "enemy" || e.deadAtTick >= 0) continue;
    const dist = Math.hypot(hero.pos.x - e.pos.x, hero.pos.y - e.pos.y);
    if (dist > hero.radius + e.radius) continue;
    // damageEntity enforces i-frames, so a pile-up costs one heart, not four.
    if (
      !damageEntity(world, hero, def.touchDamage, e.pos.x, e.pos.y, CONTACT_KNOCKBACK)
    ) {
      continue;
    }

    // Taking a hit has to be *felt*. Without this, contact damage produced no
    // burst and no screen kick — only a white flash — so losing a heart in a
    // busy room was easy to miss entirely.
    pushFx(world, {
      kind: "impact",
      x: hero.pos.x,
      y: hero.pos.y,
      angle: 0,
      tick: world.tick,
    });
    world.lastHitTick = world.tick;
  }
}
