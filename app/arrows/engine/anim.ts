import { ease, timelineAt, timelineDuration, type Phase } from "@/app/game/_shared/phases";
import { DIRS, type Arrow } from "./types";

export type FlightPhase = "wind" | "fly";

export interface Flight {
  arrow: Arrow;
  /** Cells travelled. For an exit, the run to the edge; otherwise the slide. */
  distance: number;
  /**
   * Whether the arrow leaves the board or parks short of it.
   *
   * The two need different motion, not just different endpoints: one is a
   * departure and should still be gaining speed as it crosses the edge, the
   * other is an arrival and has to settle onto the cell it stops at.
   */
  exits: boolean;
  t: number;
}

/** A misjudged tap: the arrow jolts and its blocker is called out. */
export interface Rebuff {
  id: number;
  blockerId: number;
  t: number;
}

const WIND = 0.11;
const FLY_BASE = 0.22;
const FLY_PER_CELL = 0.06;

/** Cells the arrow pulls back before it goes. */
const RECOIL = 0.22;
/** Fraction of the flight spent at full opacity before the fade begins. */
const FADE_START = 0.6;

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

export function startFlight(arrow: Arrow, distance: number, exits = true): Flight {
  return { arrow, distance, exits, t: 0 };
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

  // The wind-up eases to a stop at full recoil.
  if (at.name === "wind") return -RECOIL * ease(at.u);

  /**
   * Launch picks up exactly where the recoil stopped — same position *and*
   * same speed, which is zero.
   *
   * The previous curve carried a separate linear term that unwound the recoil,
   * so the arrow was already drifting forward the instant the wind-up ended
   * while the wind-up itself had eased to a halt. That mismatch is a kink: a
   * visible flick right at the moment the eye is on the arrow.
   *
   * Squared rather than eased, because it is leaving, not arriving — speed
   * should still be climbing as it crosses the edge. Overshoot so the body is
   * fully clear before it stops being drawn.
   */
  if (!flight.exits) {
    /**
     * A slide that stops has to *arrive*. Easing out lands it on the cell it
     * parks at instead of slamming into the blocker, and it travels exactly
     * its distance rather than overshooting — it is still on the board, and
     * the cells it now occupies are the ones the rules just gave it.
     */
    return -RECOIL + (RECOIL + flight.distance) * ease(at.u);
  }

  return -RECOIL + (RECOIL + flight.distance + 2) * at.u * at.u;
}

/** Fades out over the back half of the flight. */
export function flightAlpha(flight: Flight): number {
  // An arrow that parks is still on the board, so it never fades.
  if (!flight.exits) return 1;

  const at = timelineAt(flightPhases(flight.distance), flight.t);
  if (at.name === "wind") return 1;
  if (at.u < FADE_START) return 1;

  // Smoothstep rather than linear: a linear fade begins at full rate the
  // instant it starts, which reads as the arrow being switched off partway
  // out. This eases in and out of the fade at both ends.
  const f = (at.u - FADE_START) / (1 - FADE_START);
  return Math.max(0, 1 - f * f * (3 - 2 * f));
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

/** A position on the board in cell coordinates, allowed to be fractional. */
export interface TrackPoint {
  row: number;
  col: number;
}

/** Cells of run-up padded behind the tail, covering the wind-up recoil. */
export const TRACK_PAD = 2;

/**
 * The arrow's own route, padded at both ends.
 *
 * An arrow is a winding track, and releasing it slides that track forward along
 * *itself* — the tail retraces whatever bends the head went through. Sampling
 * positions from this path is what produces that; translating every cell by one
 * shared vector instead makes a bent arrow drift sideways out of its own
 * corridor, which is both wrong and the thing that reads as cheap.
 *
 * Padded behind the tail so the recoil has somewhere to go, and well past the
 * head so the whole body can clear the board.
 */
export function flightTrack(arrow: Arrow, ahead: number): TrackPoint[] {
  const cells = arrow.cells;
  const track: TrackPoint[] = [];

  // Behind the tail, continuing the first segment backwards. A single-cell
  // arrow has no segment, so it borrows the head's direction.
  const back =
    cells.length > 1
      ? { dy: cells[0].row - cells[1].row, dx: cells[0].col - cells[1].col }
      : { dy: -DIRS[arrow.dir].dy, dx: -DIRS[arrow.dir].dx };

  for (let i = TRACK_PAD; i >= 1; i--) {
    track.push({ row: cells[0].row + back.dy * i, col: cells[0].col + back.dx * i });
  }

  for (const cell of cells) track.push({ row: cell.row, col: cell.col });

  // Past the head, straight out along the direction it points.
  const head = cells[cells.length - 1];
  const { dx, dy } = DIRS[arrow.dir];
  for (let i = 1; i <= Math.max(1, Math.ceil(ahead)); i++) {
    track.push({ row: head.row + dy * i, col: head.col + dx * i });
  }

  return track;
}

/**
 * Sample a track at a fractional index, interpolating between its points.
 * Clamps at both ends rather than extrapolating, so an offset past the padding
 * parks at the last point instead of flying off to infinity.
 */
export function sampleTrack(track: TrackPoint[], at: number): TrackPoint {
  if (track.length === 0) return { row: 0, col: 0 };

  const clamped = Math.max(0, Math.min(track.length - 1, at));
  const low = Math.floor(clamped);
  const high = Math.min(track.length - 1, low + 1);
  const f = clamped - low;

  return {
    row: track[low].row + (track[high].row - track[low].row) * f,
    col: track[low].col + (track[high].col - track[low].col) * f,
  };
}
