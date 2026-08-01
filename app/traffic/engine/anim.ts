import {
  ease,
  timelineAt,
  timelineDuration,
  type Phase,
} from "@/app/game/_shared/phases";
import type { Move } from "./types";

export type SlidePhase = "slide" | "settle";
export type ExitPhase = "pause" | "drive";

export interface Slide {
  move: Move;
  /** Elapsed animation time, seconds. */
  t: number;
}

const SLIDE_BASE = 0.1;
const SLIDE_PER_CELL = 0.055;
/** A short overshoot-free settle reads as the car coming to rest. */
const SETTLE = 0.06;

const EXIT_PAUSE = 0.18;
const EXIT_DRIVE = 0.5;

export function slidePhases(cells: number): Phase<SlidePhase>[] {
  return [
    { name: "slide", dur: SLIDE_BASE + SLIDE_PER_CELL * Math.max(1, cells) },
    { name: "settle", dur: SETTLE },
  ];
}

export function slideDuration(cells: number): number {
  return timelineDuration(slidePhases(cells));
}

export function startSlide(move: Move): Slide {
  return { move, t: 0 };
}

/** Returns a new Slide; the caller's copy is untouched. */
export function advanceSlide(slide: Slide, dt: number): Slide {
  return { ...slide, t: slide.t + dt };
}

export function isSlideDone(slide: Slide): boolean {
  return slide.t >= slideDuration(Math.abs(slide.move.delta));
}

/**
 * How far along its slide the vehicle is, 0..1.
 *
 * Reaches 1 at the end of the slide phase and stays there through settle, so
 * the vehicle sits exactly on its destination cell while the settle plays out
 * rather than creeping past it.
 */
export function slideProgress(slide: Slide): number {
  const cells = Math.abs(slide.move.delta);
  const at = timelineAt(slidePhases(cells), slide.t);
  return at.name === "slide" ? ease(at.u) : 1;
}

export const EXIT_PHASES: readonly Phase<ExitPhase>[] = [
  { name: "pause", dur: EXIT_PAUSE },
  { name: "drive", dur: EXIT_DRIVE },
];

export function exitDuration(): number {
  return timelineDuration(EXIT_PHASES);
}

/**
 * Cells the winning car has driven past the right edge. Accelerates rather than
 * easing out — it is leaving, not arriving.
 */
export function exitOffset(t: number, boardSize: number): number {
  const at = timelineAt(EXIT_PHASES, t);
  if (at.name === "pause") return 0;
  return at.u * at.u * (boardSize + 2);
}
