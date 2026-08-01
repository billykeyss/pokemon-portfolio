import {
  ease,
  timelineAt,
  timelineDuration,
  type Phase,
  type PhaseAt as TimelinePhaseAt,
} from "@/app/game/_shared/phases";
import type { Move } from "./types";

export type PhaseName = "lift" | "travel" | "tilt" | "pour" | "untilt" | "return";

export interface Pour {
  move: Move;
  /** Units being transferred — drives the pour phase's length. */
  units: number;
  /** Palette index of the liquid in flight. */
  color: number;
  /** Elapsed animation time, seconds. */
  t: number;
}

export type PhaseAt = TimelinePhaseAt<PhaseName>;

/**
 * Paced to be watched rather than got through: a full four-unit pour runs about
 * 1.15s, a single unit about 0.85s.
 *
 * These were deliberately tighter once, on the reasoning that every tap pays
 * the cost and the board is played in bursts. That traded the wrong way — the
 * pour is the most satisfying thing on screen, and hurrying it made the motion
 * read as a state change rather than as liquid moving.
 *
 * Travel and tilt overlap in feel rather than reading as separate beats: travel
 * is the longest phase and carries an arc, so the bottle is already swinging by
 * the time it starts to tip.
 */
const LIFT = 0.09;
const TRAVEL = 0.24;
const TILT = 0.13;
const PER_UNIT = 0.1;
const UNTILT = 0.12;
const RETURN = 0.16;

/** How long the destination's surface keeps sloshing after liquid lands. */
export const WOBBLE_DURATION = 0.46;

/**
 * Tilt magnitudes in radians. Both are past a right angle on purpose: below 90
 * degrees the mouth still points upward and nothing would actually pour out.
 */
const MAX_TILT = 2.15;
const MIN_TILT = 1.75;

export function phaseDurations(units: number): Phase<PhaseName>[] {
  return [
    { name: "lift", dur: LIFT },
    { name: "travel", dur: TRAVEL },
    { name: "tilt", dur: TILT },
    { name: "pour", dur: PER_UNIT * Math.max(1, units) },
    { name: "untilt", dur: UNTILT },
    { name: "return", dur: RETURN },
  ];
}

export function totalDuration(units: number): number {
  return timelineDuration(phaseDurations(units));
}

export function phaseAt(t: number, units: number): PhaseAt {
  return timelineAt(phaseDurations(units), t);
}

export function startPour(move: Move, units: number, color: number): Pour {
  return { move, units, color, t: 0 };
}

/** Returns a new Pour; the caller's copy is left alone. */
export function advance(pour: Pour, dt: number): Pour {
  return { ...pour, t: pour.t + dt };
}

export function isDone(pour: Pour): boolean {
  return pour.t >= totalDuration(pour.units);
}

/**
 * Fractional units transferred so far. Fractional rather than stepped is what
 * makes the liquid read as flowing instead of teleporting.
 *
 * Eased rather than linear. A linear transfer starts and stops at full rate,
 * so the stream snaps on at the first frame of the pour and snaps off at the
 * last — the single biggest thing that made this look mechanical. Easing lets
 * the flow build and taper the way tipping a bottle actually behaves.
 */
export function pouredUnits(pour: Pour): number {
  const at = phaseAt(pour.t, pour.units);
  switch (at.name) {
    case "lift":
    case "travel":
    case "tilt":
      return 0;
    case "pour":
      return ease(at.u) * pour.units;
    default:
      return pour.units;
  }
}

/**
 * How hard the liquid is flowing right now, 0..1, peaking mid-pour.
 *
 * This is the rate that `pouredUnits` is the integral of, so the stream can be
 * drawn thin as it starts, full mid-pour and thin again as it stops, instead of
 * being a bar that blinks in and out at constant width.
 */
export function pourRate(pour: Pour): number {
  const at = phaseAt(pour.t, pour.units);
  if (at.name !== "pour") return 0;
  return 4 * at.u * (1 - at.u);
}

/**
 * Tilt magnitude, always positive — the caller applies the sign, since a bottle
 * pouring to its left rotates the other way.
 *
 * A fuller bottle needs less tilt before liquid reaches the lip: the same
 * reason you barely tip a full glass and upend an almost-empty one.
 */
export function tiltAngle(remaining: number, capacity: number): number {
  const fill = Math.max(0, Math.min(1, remaining / Math.max(1, capacity)));
  return MAX_TILT + (MIN_TILT - MAX_TILT) * fill;
}

/**
 * Height of the travel arc, 0..1, peaking mid-flight.
 *
 * Without this the bottle slides along a straight line between two points,
 * which reads as a UI element moving rather than a hand carrying something. The
 * arc is asymmetric — it rises faster than it falls — so the bottle settles
 * onto the target instead of dropping onto it.
 */
export function travelArc(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return Math.sin(Math.pow(c, 0.85) * Math.PI);
}

/**
 * Damped oscillation of a liquid surface after something lands in it, in units
 * of surface height. Returns 0 once settled, so a caller can add it blindly.
 */
export function surfaceWobble(elapsed: number): number {
  if (elapsed < 0 || elapsed >= WOBBLE_DURATION) return 0;
  const u = elapsed / WOBBLE_DURATION;
  return Math.sin(u * Math.PI * 4.2) * (1 - u) * (1 - u) * 0.22;
}

/**
 * Seconds since the pour phase ended, or null while liquid is still falling.
 * The wobble belongs to the phases *after* the pour — during it, the surface is
 * still rising and a wobble would fight the fill.
 */
export function sincePour(pour: Pour): number | null {
  const phases = phaseDurations(pour.units);
  const pourEnds = phases.slice(0, 4).reduce((n, p) => n + p.dur, 0);
  return pour.t < pourEnds ? null : pour.t - pourEnds;
}
