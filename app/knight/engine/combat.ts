import type { Entity } from "./types";
import type { World } from "./world";
import { statsOf } from "./stats";
import {
  WINDUP_TICKS,
  ACTIVE_TICKS,
  RECOVER_TICKS,
  IFRAME_TICKS,
  SWING_REACH,
  SWING_ARC,
  SWING_DAMAGE,
  KNOCKBACK,
} from "./constants";

// Re-exported so existing consumers (world.ts, combat.test.ts, stats.ts)
// keep importing these from "./combat" unchanged. The values live in
// constants.ts — a leaf module — so that stats.ts, which needs them for
// BASE_STATS, never has to import this file back. See the comment on
// WINDUP_TICKS in constants.ts for why that matters.
export { WINDUP_TICKS, ACTIVE_TICKS, RECOVER_TICKS, IFRAME_TICKS, SWING_REACH, SWING_ARC, SWING_DAMAGE, KNOCKBACK };

/**
 * An enemy's window. Short by design: the swing cycle is WINDUP + ACTIVE +
 * RECOVER, so anything close to that length silently makes the hero unable to
 * hit the same target twice.
 */
export const ENEMY_IFRAME_TICKS = 6;

/**
 * Knockback applied when the hero is hurt by contact.
 *
 * Much gentler than a swing's. Being flung at full KNOCKBACK every time an
 * enemy brushed you separated the pair faster than a 14-tick wind-up could
 * land, so the hero swung constantly and hit nothing — the attack looked
 * broken from the player's side even though the state machine was working.
 */
export const CONTACT_KNOCKBACK = 70;

/**
 * Distance-only reach test, ignoring facing.
 *
 * `reach` has no default: every production caller already resolves it from
 * `statsOf(world)` (a bought reach bonus must widen this the same way it
 * widens the arc test below), so a fallback to the base `SWING_REACH` would
 * only ever be reached by a caller that forgot to pass the real value — a
 * silent trap, not a convenience.
 */
export function inSwingRange(attacker: Entity, target: Entity, reach: number): boolean {
  const dx = target.pos.x - attacker.pos.x;
  const dy = target.pos.y - attacker.pos.y;
  return Math.hypot(dx, dy) <= reach + target.radius;
}

export interface SwingHit {
  targetId: number;
  damage: number;
  killed: boolean;
}

/** The attacker's effective reach, including anything the run has earned. */
export function reachOf(world: World): number {
  return statsOf(world).reach;
}

/**
 * Whether `target` is inside `attacker`'s swing wedge.
 *
 * `reach` and `arc` both come from the caller rather than defaulting to
 * `SWING_REACH`/`SWING_ARC` here, for the same reason `inSwingRange` above
 * takes `reach` explicitly: re-deriving either locally would contradict
 * `statsOf` being the single source of truth, and becomes a live bug the
 * moment a future weapon (phase 2's gear shelf) sets a per-weapon arc — a
 * hardcoded `SWING_ARC / 2` here would silently ignore it.
 */
export function inSwingArc(attacker: Entity, target: Entity, reach: number, arc: number): boolean {
  const dx = target.pos.x - attacker.pos.x;
  const dy = target.pos.y - attacker.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > reach + target.radius) return false;

  if (dist === 0) return true;

  const dot = (dx / dist) * attacker.facing.x + (dy / dist) * attacker.facing.y;
  // Clamp guards against a floating-point |dot| slightly over 1.
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= arc / 2;
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
  knockback = KNOCKBACK,
): boolean {
  if (target.deadAtTick >= 0) return false;
  if (target.hitAtTick >= 0 && world.tick - target.hitAtTick < target.iframeTicks) {
    return false;
  }

  target.hp -= amount;
  target.hitAtTick = world.tick;

  const dx = target.pos.x - fromX;
  const dy = target.pos.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  target.vel.x = (dx / dist) * knockback;
  target.vel.y = (dy / dist) * knockback;

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
 *
 * Gated on reachOf, not the base SWING_REACH: the decision to *start* a swing
 * and the decision of what that swing *hits* have to use the same number.
 * While they disagreed, a bought reach bonus widened the blow but never
 * widened the trigger, so a hero with +45 reach stood idle beside a foe at
 * 80px — the "auto attack doesn't work" bug in its purest form.
 */
function foeInReach(world: World, attacker: Entity): Entity | null {
  let best: Entity | null = null;
  let bestDist = Infinity;
  for (const t of world.entities) {
    if (t.kind === attacker.kind || t.deadAtTick >= 0) continue;
    const dist = Math.hypot(t.pos.x - attacker.pos.x, t.pos.y - attacker.pos.y);
    if (dist > reachOf(world) + t.radius) continue;
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
  const s = statsOf(world);

  switch (e.attack.phase) {
    case "idle": {
      // Swing whenever something is in reach, moving or not.
      //
      // This replaces an earlier "stop to swing" rule. Stopping meant lifting
      // your thumb, and since enemies chase you, the natural motion — hold and
      // reposition — was exactly the motion that stopped you attacking.
      // Spacing now costs you position rather than your attack.
      const foe = foeInReach(world, e);
      if (!foe) break;
      e.attack.phase = "windup";
      e.attack.startedAtTick = world.tick;
      e.attack.targetId = foe.id;

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
      if (elapsed >= s.windupTicks) {
        e.attack.phase = "active";
        e.attack.startedAtTick = world.tick;

        for (const target of world.entities) {
          if (target.kind === e.kind || target.deadAtTick >= 0) continue;

          // The target you locked onto at wind-up lands on distance alone.
          // Facing is fixed when the swing starts, and over 14 wind-up ticks a
          // point-blank pair drift around each other — so an arc-only check
          // rejected the very enemy the swing was aimed at. Everything else
          // still has to be in front of you, so being surrounded stays
          // dangerous.
          const reach = reachOf(world);
          const locked = e.attack.targetId === target.id && inSwingRange(e, target, reach);
          if (!locked && !inSwingArc(e, target, reach, s.arc)) continue;
          if (!damageEntity(world, target, s.damage, e.pos.x, e.pos.y, s.knockback)) continue;
          hits.push({
            targetId: target.id,
            damage: s.damage,
            killed: target.deadAtTick >= 0,
          });
        }
      }
      break;

    case "active":
      if (elapsed >= s.activeTicks) {
        e.attack.phase = "recover";
        e.attack.startedAtTick = world.tick;
      }
      break;

    case "recover":
      if (elapsed >= s.recoverTicks) {
        e.attack.phase = "idle";
        e.attack.startedAtTick = world.tick;
        e.attack.targetId = -1;
      }
      break;
  }

  return hits;
}
