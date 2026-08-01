import { ease, timelineAt, timelineDuration, type Phase } from "@/app/game/_shared/phases";

export type FlyPhase = "lift" | "fly" | "land";

export interface Fly {
  /** Item type in flight. */
  type: number;
  fromColumn: number;
  /** Tray slot it is heading for. */
  toSlot: number;
  t: number;
}

const LIFT = 0.07;
const FLY = 0.19;
const LAND = 0.06;

/** How long a cleared set stays on screen popping. */
export const POP_DURATION = 0.32;

export const FLY_PHASES: readonly Phase<FlyPhase>[] = [
  { name: "lift", dur: LIFT },
  { name: "fly", dur: FLY },
  { name: "land", dur: LAND },
];

export function flyDuration(): number {
  return timelineDuration(FLY_PHASES);
}

export function startFly(type: number, fromColumn: number, toSlot: number): Fly {
  return { type, fromColumn, toSlot, t: 0 };
}

/** Returns a new Fly; the caller's copy is untouched. */
export function advanceFly(fly: Fly, dt: number): Fly {
  return { ...fly, t: fly.t + dt };
}

export function isFlyDone(fly: Fly): boolean {
  return fly.t >= flyDuration();
}

/**
 * Travel from shelf to tray, 0..1. Stays at 0 through the lift so the item
 * visibly comes off the shelf before it starts moving, and pins at 1 through
 * the landing rather than drifting past the slot.
 */
export function flyProgress(fly: Fly): number {
  const at = timelineAt(FLY_PHASES, fly.t);
  if (at.name === "lift") return 0;
  if (at.name === "land") return 1;
  return ease(at.u);
}

/** Extra height at the midpoint, so the item arcs instead of sliding. */
export function flyArc(fly: Fly): number {
  const p = flyProgress(fly);
  return Math.sin(p * Math.PI);
}

/** How far out of its column the item has risen, 0..1. */
export function liftAmount(fly: Fly): number {
  const at = timelineAt(FLY_PHASES, fly.t);
  return at.name === "lift" ? ease(at.u) : 1;
}

/**
 * Scale for a set popping off the tray: a quick swell, then away to nothing.
 * `t` runs from 0 to POP_DURATION.
 */
export function popScale(t: number): number {
  const u = Math.max(0, Math.min(1, t / POP_DURATION));
  return u < 0.35 ? 1 + u * 0.9 : Math.max(0, 1.315 * (1 - (u - 0.35) / 0.65));
}
