import { ease, timelineAt, timelineDuration, type Phase } from "@/app/game/_shared/phases";
import type { Arrow } from "./types";

export type FlightPhase = "wind" | "fly";

export interface Flight {
  arrow: Arrow;
  /** Cells travelled before leaving the board; longer trips take longer. */
  distance: number;
  t: number;
}

/** A misjudged tap: the arrow jolts and its blocker is called out. */
export interface Rebuff {
  id: number;
  blockerId: number;
  t: number;
}

const WIND = 0.07;
const FLY_BASE = 0.12;
const FLY_PER_CELL = 0.028;

export const REBUFF_DURATION = 0.42;

export function flightPhases(distance: number): Phase<FlightPhase>[] {
  return [
    { name: "wind", dur: WIND },
    { name: "fly", dur: FLY_BASE + FLY_PER_CELL * Math.max(1, distance) },
  ];
}

export function flightDuration(distance: number): number {
  return timelineDuration(flightPhases(distance));
}

export function startFlight(arrow: Arrow, distance: number): Flight {
  return { arrow, distance, t: 0 };
}

/** Returns a new Flight; the caller's copy is untouched. */
export function advanceFlight(flight: Flight, dt: number): Flight {
  return { ...flight, t: flight.t + dt };
}

export function isFlightDone(flight: Flight): boolean {
  return flight.t >= flightDuration(flight.distance);
}

/**
 * How far along its exit the arrow is, in cells.
 *
 * The wind-up pulls it *backwards* a little before it goes. Without it the
 * arrow simply vanishes off the edge, and a released arrow and a deleted one
 * look identical — the recoil is what reads as "it launched".
 */
export function flightOffset(flight: Flight): number {
  const at = timelineAt(flightPhases(flight.distance), flight.t);
  if (at.name === "wind") return -0.22 * ease(at.u);

  // Accelerating rather than eased: it is leaving, not arriving. Overshoot the
  // edge so it is fully clear of the board before it stops being drawn.
  const u = at.u * at.u;
  return -0.22 * (1 - at.u) + u * (flight.distance + 2);
}

/** Fades out over the back half of the flight. */
export function flightAlpha(flight: Flight): number {
  const at = timelineAt(flightPhases(flight.distance), flight.t);
  if (at.name === "wind") return 1;
  return at.u < 0.55 ? 1 : Math.max(0, 1 - (at.u - 0.55) / 0.45);
}

export function startRebuff(id: number, blockerId: number): Rebuff {
  return { id, blockerId, t: 0 };
}

export function advanceRebuff(rebuff: Rebuff, dt: number): Rebuff {
  return { ...rebuff, t: rebuff.t + dt };
}

export function isRebuffDone(rebuff: Rebuff): boolean {
  return rebuff.t >= REBUFF_DURATION;
}

/** Sideways jolt of a refused arrow, in cells. Damped so it settles. */
export function rebuffShake(t: number): number {
  if (t < 0 || t >= REBUFF_DURATION) return 0;
  const u = t / REBUFF_DURATION;
  return Math.sin(u * Math.PI * 6) * (1 - u) * 0.14;
}

/** Brightness of the call-out on the blocking arrow, 0..1. */
export function rebuffGlow(t: number): number {
  if (t < 0 || t >= REBUFF_DURATION) return 0;
  const u = t / REBUFF_DURATION;
  return 1 - u;
}
