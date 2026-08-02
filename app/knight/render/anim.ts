import type { Entity } from "../engine/types";
import { WINDUP_TICKS, ACTIVE_TICKS, RECOVER_TICKS } from "../engine/combat";
import { CORPSE_TICKS } from "../engine/world";

export interface Pose {
  /** Sprite offset from the entity's position, in pixels. */
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  /** Lean, in radians. */
  tilt: number;
  /** White-out amount, 0..1. */
  flash: number;
}

/** Ticks a hit stays visibly white. */
const FLASH_TICKS = 14;
/** How far the sprite pulls back winding up, and lunges swinging. */
const WINDUP_PULL = 5;
const LUNGE_REACH = 9;
const WALK_SPEED_REF = 132;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * The visual pose for an entity at a tick.
 *
 * Pure on purpose: a pose is a function of simulation state and time, so it
 * cannot drift out of sync with the game, and it is testable without a browser.
 */
export function poseFor(e: Entity, tick: number): Pose {
  const pose: Pose = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    tilt: 0,
    flash: 0,
  };

  // --- death overrides everything ----------------------------------------
  if (e.deadAtTick >= 0) {
    const t = clamp01((tick - e.deadAtTick) / CORPSE_TICKS);
    pose.scaleY = Math.max(0, 1 - t);
    pose.scaleX = 1 + t * 0.5;
    pose.flash = clamp01(1 - t * 2);
    return pose;
  }

  // --- locomotion ---------------------------------------------------------
  const speed = Math.hypot(e.vel.x, e.vel.y);
  const moving = speed > 8;
  const bobRate = moving ? 0.34 : 0.09;
  const bobAmp = moving ? 2.4 : 1.2;
  const phase = tick * bobRate;

  // A true oscillation, not Math.abs(sin) — the sprite must rise above and
  // sink below its rest position, or a bob reads as a one-way drift.
  pose.offsetY = -Math.sin(phase) * bobAmp;

  if (moving) {
    const squash = Math.sin(phase * 2) * 0.06;
    pose.scaleY = 1 + squash;
    pose.scaleX = 1 - squash;
    // Lean away from travel: a positive x velocity leans the sprite left.
    pose.tilt = -(e.vel.x / WALK_SPEED_REF) * 0.16;
  } else {
    const breathe = Math.sin(phase) * 0.02;
    pose.scaleY = 1 + breathe;
    pose.scaleX = 1 - breathe;
  }

  // --- attack -------------------------------------------------------------
  const elapsed = tick - e.attack.startedAtTick;
  if (e.attack.phase === "windup") {
    const t = clamp01(elapsed / WINDUP_TICKS);
    pose.offsetX -= e.facing.x * WINDUP_PULL * t;
    pose.offsetY -= e.facing.y * WINDUP_PULL * t;
  } else if (e.attack.phase === "active") {
    const t = clamp01(elapsed / ACTIVE_TICKS);
    pose.offsetX += e.facing.x * LUNGE_REACH * (1 - t);
    pose.offsetY += e.facing.y * LUNGE_REACH * (1 - t);
  } else if (e.attack.phase === "recover") {
    const t = clamp01(elapsed / RECOVER_TICKS);
    const ease = (1 - t) * (1 - t);
    pose.offsetX += e.facing.x * LUNGE_REACH * 0.35 * ease;
    pose.offsetY += e.facing.y * LUNGE_REACH * 0.35 * ease;
  }

  // --- hit flash ----------------------------------------------------------
  if (e.hitAtTick >= 0) {
    const since = tick - e.hitAtTick;
    if (since >= 0 && since < FLASH_TICKS) {
      pose.flash = clamp01(1 - since / FLASH_TICKS);
    }
  }

  return pose;
}

/** How long a shake takes to decay away, in ticks (~0.15s at 120Hz). */
export const SHAKE_TICKS = 18;
/** Peak displacement in pixels. */
export const SHAKE_PEAK = 2.2;

/**
 * Screen shake magnitude, decaying from the most recent hit.
 *
 * Deliberately small and short. Hits land constantly in a busy room, so this
 * re-triggers often; a large amplitude turns a punchy kick into a permanent
 * tremor that makes the game unpleasant to look at. Squaring the falloff drops
 * it away fast rather than lingering at half strength.
 */
export function shakeFrom(lastHitTick: number, tick: number): number {
  if (lastHitTick < 0) return 0;
  const since = tick - lastHitTick;
  if (since < 0 || since >= SHAKE_TICKS) return 0;
  const t = 1 - since / SHAKE_TICKS;
  return t * t * SHAKE_PEAK;
}
