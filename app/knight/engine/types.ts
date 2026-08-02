export type Vec2 = { x: number; y: number };

export type EntityKind = "hero" | "enemy";

export type AttackPhase = "idle" | "windup" | "active" | "recover";

export interface AttackState {
  phase: AttackPhase;
  /** Tick the current phase began. Drives both timing and animation. */
  startedAtTick: number;
  /**
   * The foe this swing locked onto at wind-up, or -1.
   *
   * Facing is fixed when a swing starts, but the pair keep moving through the
   * wind-up. Remembering the target lets the blow land on the enemy it was
   * aimed at without making every other direction hittable too.
   */
  targetId: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  /** Unit vector the entity is facing; drives swing direction and sprite flip. */
  facing: Vec2;
  /** Tick this entity last took damage, or -1. Drives i-frames and hit flash. */
  hitAtTick: number;
  /**
   * How long this entity is invulnerable after a hit, in ticks.
   *
   * Per-entity because the two kinds need opposite things. The hero needs a
   * real window so a crowd cannot chain-delete it. An enemy needs almost none:
   * a swing already lands only on the single tick it goes active, and a window
   * as long as the swing cycle made every follow-up blow whiff at point-blank
   * range — the hero could never land a second hit on anything.
   */
  iframeTicks: number;
  /** Tick this entity died, or -1. Corpses linger briefly so death can animate. */
  deadAtTick: number;
  attack: AttackState;
}

export interface Arena {
  width: number;
  height: number;
}
