import {
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
 * Tuned so a full four-unit pour lands comfortably under a second. This game is
 * played in fast bursts of taps — an animation the player has to wait out turns
 * a puzzle into a queue.
 */
const LIFT = 0.08;
const TRAVEL = 0.13;
const TILT = 0.09;
const PER_UNIT = 0.075;
const UNTILT = 0.08;
const RETURN = 0.1;

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
 */
export function pouredUnits(pour: Pour): number {
  const at = phaseAt(pour.t, pour.units);
  switch (at.name) {
    case "lift":
    case "travel":
    case "tilt":
      return 0;
    case "pour":
      return at.u * pour.units;
    default:
      return pour.units;
  }
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
