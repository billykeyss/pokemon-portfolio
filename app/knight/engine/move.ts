import type { Entity, Vec2 } from "./types";
import type { World } from "./world";
import { statsOf } from "./stats";
import { HERO_SPEED } from "./constants";

export { HERO_SPEED };
/** How fast velocity converges on the desired velocity, per second. */
export const ACCEL = 14;
/** Below this speed the hero counts as standing still, and may swing. */
export const STOP_SPEED = 18;
/** Inside this distance of the target, stop pushing — otherwise the hero
 *  oscillates around the thumb. */
const ARRIVE_RADIUS = 6;

/**
 * Move the hero toward the drag target.
 *
 * Velocity is eased toward the desired velocity rather than set to it: setting
 * it directly makes the hero feel like a cursor, and the whole skill of the
 * game is spacing, which needs weight to read.
 */
export function steerHero(world: World, hero: Entity, target: Vec2 | null, dt: number): void {
  let desiredX = 0;
  let desiredY = 0;

  if (target) {
    const dx = target.x - hero.pos.x;
    const dy = target.y - hero.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > ARRIVE_RADIUS) {
      const speed = statsOf(world).moveSpeed;
      desiredX = (dx / dist) * speed;
      desiredY = (dy / dist) * speed;
    }
  }

  // Exponential convergence, frame-rate independent.
  const k = 1 - Math.exp(-ACCEL * dt);
  hero.vel.x += (desiredX - hero.vel.x) * k;
  hero.vel.y += (desiredY - hero.vel.y) * k;

  // Face where we are actually going, and hold that facing once stopped so the
  // sprite does not snap back to a default the moment the thumb lifts.
  const speed = Math.hypot(hero.vel.x, hero.vel.y);
  if (speed > STOP_SPEED) {
    hero.facing.x = hero.vel.x / speed;
    hero.facing.y = hero.vel.y / speed;
  }
}

export function isStandingStill(e: Entity): boolean {
  return Math.hypot(e.vel.x, e.vel.y) < STOP_SPEED;
}
