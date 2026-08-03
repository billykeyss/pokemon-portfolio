import type { World } from "./world";
// Deliberately from "./constants", not "./combat": combat.ts imports statsOf
// from this file, so importing these back from combat.ts would make the two
// modules cyclic, and whichever one loads first would read these consts
// before they're assigned (the same bug HERO_SPEED used to cause via
// move.ts). constants.ts is a leaf — it imports nothing from this file — so
// no cycle is possible regardless of which module some future test or page
// happens to import first.
import {
  SWING_REACH,
  SWING_ARC,
  SWING_DAMAGE,
  KNOCKBACK,
  WINDUP_TICKS,
  ACTIVE_TICKS,
  RECOVER_TICKS,
  IFRAME_TICKS,
  HERO_HP,
  HERO_SPEED,
} from "./constants";

/**
 * Every number a run can change, resolved.
 *
 * One function owns this arithmetic so no consumer re-derives a stat locally.
 * Later phases add layers — equipped gear, the current evolution form — and
 * they slot in here rather than scattering multipliers through the engine.
 */
export interface Stats {
  reach: number;
  /** Total width of the swing wedge, in radians. */
  arc: number;
  damage: number;
  maxHp: number;
  moveSpeed: number;
  knockback: number;
  windupTicks: number;
  activeTicks: number;
  recoverTicks: number;
  iframeTicks: number;
  coinMult: number;
}

export const BASE_STATS: Stats = {
  reach: SWING_REACH,
  arc: SWING_ARC,
  damage: SWING_DAMAGE,
  maxHp: HERO_HP,
  moveSpeed: HERO_SPEED,
  knockback: KNOCKBACK,
  windupTicks: WINDUP_TICKS,
  activeTicks: ACTIVE_TICKS,
  recoverTicks: RECOVER_TICKS,
  iframeTicks: IFRAME_TICKS,
  coinMult: 1,
};

/** At least one tick, always whole: a zero-length phase would never resolve. */
const ticks = (base: number, mult: number): number =>
  Math.max(1, Math.round(base * mult));

export function statsOf(world: World): Stats {
  const m = world.mods;
  return {
    // Floored at 1px: a non-positive reach would make the hero unable to ever
    // hit anything, which is a softlock rather than a weak build.
    reach: Math.max(1, BASE_STATS.reach + m.reachBonus),
    arc: BASE_STATS.arc,
    damage: Math.max(1, BASE_STATS.damage + m.damageBonus),
    maxHp: Math.max(1, BASE_STATS.maxHp + m.maxHpBonus),
    moveSpeed: BASE_STATS.moveSpeed * m.moveSpeedMult,
    knockback: BASE_STATS.knockback * m.knockbackMult,
    windupTicks: ticks(BASE_STATS.windupTicks, m.swingSpeedMult),
    activeTicks: ticks(BASE_STATS.activeTicks, m.swingSpeedMult),
    recoverTicks: ticks(BASE_STATS.recoverTicks, m.swingSpeedMult),
    // Rounded like the swing-timing fields, but floored at 0 rather than 1:
    // zero i-frames is a valid (if risky) build, unlike a zero-length swing
    // phase, which would never resolve.
    iframeTicks: Math.max(0, Math.round(BASE_STATS.iframeTicks + m.iframeBonus)),
    coinMult: m.coinMult,
  };
}
