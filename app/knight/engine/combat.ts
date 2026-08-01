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

/**
 * The nearest living entity of the *opposite* kind within swing reach, or
 * null. Ties resolve by lowest `id` so the choice is deterministic.
 *
 * Distance-only, not arc-gated: this runs at the moment an attacker decides
 * whether to *start* a swing, before facing has been pointed at anyone. Its
 * result becomes that facing (see updateAttack's "idle" case), so gating on
 * inSwingArc here would be circular — it would reject the very foe the
 * attacker is about to turn toward. It must also be the opposite kind, not
 * literally "enemy": stepWorld used to run updateAttack over every entity,
 * and zero distance always satisfies an arc check, so a hardcoded kind check
 * made every stationary enemy match itself and wind up forever regardless of
 * where the hero was.
 */
function foeInReach(world: World, attacker: Entity): Entity | null {
  let best: Entity | null = null;
  let bestDist = Infinity;
  for (const t of world.entities) {
    if (t.kind === attacker.kind || t.deadAtTick >= 0) continue;
    const dist = Math.hypot(t.pos.x - attacker.pos.x, t.pos.y - attacker.pos.y);
    if (dist > SWING_REACH + t.radius) continue;
    if (dist < bestDist || (dist === bestDist && (best === null || t.id < best.id))) {
      best = t;
      bestDist = dist;
    }
  }
  return best;
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
    case "idle": {
      // Stopping next to something is the whole input for attacking.
      if (!isStandingStill(e)) break;
      const foe = foeInReach(world, e);
      if (!foe) break;
      e.attack.phase = "windup";
      e.attack.startedAtTick = world.tick;

      // Auto-aim: face the foe we are about to swing at, right now, as the
      // swing begins. Facing must not be left to whatever `vel` last pointed
      // at — damageEntity writes knockback straight into vel (see below),
      // and steerHero derives walking facing from vel, so a hero that was
      // just hit turns to face away from its attacker. Setting facing here,
      // from intent rather than from stale knockback velocity, is what makes
      // the "auto-aim so the player never fights the controls" promise real.
      const dx = foe.pos.x - e.pos.x;
      const dy = foe.pos.y - e.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.facing.x = dx / dist;
      e.facing.y = dy / dist;
      break;
    }

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
