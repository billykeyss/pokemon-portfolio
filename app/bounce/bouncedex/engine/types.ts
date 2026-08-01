import type { Vec2 } from "./vec";

export type BodyKind = "projectile" | "settled" | "enemy";

export interface Body {
  id: number;
  kind: BodyKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  mass: number;
  /** 0 = dead stop on impact, 1 = perfectly elastic. */
  restitution: number;
  hp: number;
  /** Critter definition id for projectiles/settled bodies; null for enemies. */
  critterId: string | null;
  /** Damage events this body has caused. Drives evolution. */
  hitsDealt: number;
  /**
   * Enemies struck since this body was launched. A combo belongs to a single
   * launch, so it lives on the projectile rather than on the world — several
   * projectiles are usually airborne at once and their chains must not merge.
   */
  chain: number;
  settled: boolean;
  /** Ghost: remaining bodies this projectile may pass straight through. */
  phasesLeft: number;
  /** Splitter: fragments are flagged so a burst cannot cascade. */
  hasSplit: boolean;
  /** Sticky: id of the enemy this critter is riding, or null. */
  attachedTo: number | null;
  /** Tick this body last evolved, or -1. Drives the evolution flash. */
  evolvedAtTick: number;
  /**
   * How hard this shot was charged, 0..1. A charged critter resists settling,
   * so it ricochets far longer and racks up a real chain — the payoff that
   * makes aiming worth doing rather than idling.
   */
  charge: number;
}

export interface Arena {
  width: number;
  height: number;
}
