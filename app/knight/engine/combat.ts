import type { Entity } from "./types";
import type { World } from "./world";
import { isStandingStill } from "./move";

/** Swing timing, in ticks at 120Hz. Wind-up is long enough to read as a tell. */
export const WINDUP_TICKS = 14;
export const ACTIVE_TICKS = 7;
export const RECOVER_TICKS = 20;

/** Invulnerability after taking a hit, so a crowd cannot chain-delete you. */
export const IFRAME_TICKS = 42;

export const SWING_REACH = 46;
/** Total arc width in radians — generous, because aiming is automatic. */
export const SWING_ARC = Math.PI * 0.7;
export const SWING_DAMAGE = 10;
export const KNOCKBACK = 210;

export interface SwingHit {
  targetId: number;
  damage: number;
  killed: boolean;
}

/** Whether `target` is inside `attacker`'s swing wedge. */
export function inSwingArc(attacker: Entity, target: Entity): boolean {
  const dx = target.pos.x - attacker.pos.x;
  const dy = target.pos.y - attacker.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > SWING_REACH + target.radius) return false;
  if (dist === 0) return true;

  const dot = (dx / dist) * attacker.facing.x + (dy / dist) * attacker.facing.y;
  // Clamp guards against a floating-point |dot| slightly over 1.
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= SWING_ARC / 2;
}

/**
 * Apply damage, knockback and invulnerability.
 * Returns false when the hit was refused — during i-frames, or on a corpse.
 *
 * A killed entity is *marked* dead rather than removed, so the renderer gets a
 * frame to animate the death and so removing it cannot invalidate an array
 * another loop is mid-way through.
 */
export function damageEntity(
  world: World,
  target: Entity,
  amount: number,
  fromX: number,
  fromY: number,
): boolean {
  if (target.deadAtTick >= 0) return false;
  if (target.hitAtTick >= 0 && world.tick - target.hitAtTick < IFRAME_TICKS) {
    return false;
  }

  target.hp -= amount;
  target.hitAtTick = world.tick;

  const dx = target.pos.x - fromX;
  const dy = target.pos.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  target.vel.x = (dx / dist) * KNOCKBACK;
  target.vel.y = (dy / dist) * KNOCKBACK;

  if (target.hp <= 0) target.deadAtTick = world.tick;
  return true;
}

/** True when any living enemy sits inside the hero's swing wedge. */
function enemyInReach(world: World, hero: Entity): boolean {
  return world.entities.some(
    (e) => e.kind === "enemy" && e.deadAtTick < 0 && inSwingArc(hero, e),
  );
}

/**
 * Drive one entity's attack state machine and resolve its damage.
 *
 * Damage lands on the single tick the swing enters `active`, not for the whole
 * active window: applying it every active tick would multiply a swing's damage
 * by its duration.
 */
export function updateAttack(world: World, e: Entity): SwingHit[] {
  if (e.deadAtTick >= 0) {
    e.attack.phase = "idle";
    return [];
  }

  const elapsed = world.tick - e.attack.startedAtTick;
  const hits: SwingHit[] = [];

  switch (e.attack.phase) {
    case "idle":
      // Stopping next to something is the whole input for attacking.
      if (isStandingStill(e) && enemyInReach(world, e)) {
        e.attack.phase = "windup";
        e.attack.startedAtTick = world.tick;
      }
      break;

    case "windup":
      if (elapsed >= WINDUP_TICKS) {
        e.attack.phase = "active";
        e.attack.startedAtTick = world.tick;

        for (const target of world.entities) {
          if (target.kind === e.kind || target.deadAtTick >= 0) continue;
          if (!inSwingArc(e, target)) continue;
          if (!damageEntity(world, target, SWING_DAMAGE, e.pos.x, e.pos.y)) continue;
          hits.push({
            targetId: target.id,
            damage: SWING_DAMAGE,
            killed: target.deadAtTick >= 0,
          });
        }
      }
      break;

    case "active":
      if (elapsed >= ACTIVE_TICKS) {
        e.attack.phase = "recover";
        e.attack.startedAtTick = world.tick;
      }
      break;

    case "recover":
      if (elapsed >= RECOVER_TICKS) {
        e.attack.phase = "idle";
        e.attack.startedAtTick = world.tick;
      }
      break;
  }

  return hits;
}
