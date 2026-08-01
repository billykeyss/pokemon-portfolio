export type Vec2 = { x: number; y: number };

export type EntityKind = "hero" | "enemy";

export type AttackPhase = "idle" | "windup" | "active" | "recover";

export interface AttackState {
  phase: AttackPhase;
  /** Tick the current phase began. Drives both timing and animation. */
  startedAtTick: number;
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
  /** Tick this entity died, or -1. Corpses linger briefly so death can animate. */
  deadAtTick: number;
  attack: AttackState;
}

export interface Arena {
  width: number;
  height: number;
}
