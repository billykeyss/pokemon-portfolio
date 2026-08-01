import { ease, timelineAt, timelineDuration, type Phase } from "@/app/game/_shared/phases";

export type FlyPhase = "lift" | "fly" | "land";

export interface Fly {
  /** Item type in flight. */
  type: number;
  from: { shelf: number; slot: number };
  to: { shelf: number; slot: number };
  t: number;
}

const LIFT = 0.06;
const FLY = 0.2;
const LAND = 0.07;

/** How long a cleared shelf stays on screen popping. */
export const POP_DURATION = 0.34;

export const FLY_PHASES: readonly Phase<FlyPhase>[] = [
  { name: "lift", dur: LIFT },
  { name: "fly", dur: FLY },
  { name: "land", dur: LAND },
];

export function flyDuration(): number {
  return timelineDuration(FLY_PHASES);
}

export function startFly(
  type: number,
  from: { shelf: number; slot: number },
  to: { shelf: number; slot: number },
): Fly {
  return { type, from, to, t: 0 };
}

/** Returns a new Fly; the caller's copy is untouched. */
export function advanceFly(fly: Fly, dt: number): Fly {
  return { ...fly, t: fly.t + dt };
}

export function isFlyDone(fly: Fly): boolean {
  return fly.t >= flyDuration();
}

/**
 * Travel from one slot to the other, 0..1. Holds at 0 through the lift so the
 * item visibly comes off the shelf before it moves, and pins at 1 through the
 * landing rather than drifting past its destination.
 */
export function flyProgress(fly: Fly): number {
  const at = timelineAt(FLY_PHASES, fly.t);
  if (at.name === "lift") return 0;
  if (at.name === "land") return 1;
  return ease(at.u);
}

/** Extra height at the midpoint, so the item arcs instead of sliding flat. */
export function flyArc(fly: Fly): number {
  return Math.sin(flyProgress(fly) * Math.PI);
}

/** How far the item has risen out of its slot, 0..1. */
export function liftAmount(fly: Fly): number {
  const at = timelineAt(FLY_PHASES, fly.t);
  return at.name === "lift" ? ease(at.u) : 1;
}

/**
 * Scale for a shelf's worth of goods popping: a quick swell, then away to
 * nothing. `t` runs from 0 to POP_DURATION.
 */
export function popScale(t: number): number {
  const u = Math.max(0, Math.min(1, t / POP_DURATION));
  return u < 0.35 ? 1 + u * 0.9 : Math.max(0, 1.315 * (1 - (u - 0.35) / 0.65));
}
