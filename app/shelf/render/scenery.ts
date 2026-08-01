import { makeRng } from "@/app/game/_shared/rng";

export interface Mote {
  /** Position across the canvas, 0..1. */
  x: number;
  y: number;
  r: number;
  /** Drifts this fraction of the canvas per second. */
  speed: number;
  /** Horizontal sway, as a fraction of canvas width. */
  sway: number;
  phase: number;
  alpha: number;
}

/**
 * Dust drifting in the light.
 *
 * Seeded rather than random so the field is identical on every mount — one
 * that reshuffles whenever the component remounts reads as a glitch — and so
 * it can be asserted on.
 */
export function moteField(count: number, seed = 4242): Mote[] {
  const rng = makeRng(seed);
  const motes: Mote[] = [];

  for (let i = 0; i < count; i++) {
    motes.push({
      x: rng.next(),
      y: rng.next(),
      r: 0.0018 + rng.next() * 0.004,
      // Slow, and slower still than the bubbles in Potion Sort: dust settles,
      // it does not rise.
      speed: 0.006 + rng.next() * 0.016,
      sway: 0.01 + rng.next() * 0.035,
      phase: rng.next(),
      alpha: 0.1 + rng.next() * 0.22,
    });
  }

  return motes;
}

/**
 * Where a mote sits at `clock`, in canvas pixels. Drifts downward and wraps,
 * so the field never visibly restarts.
 */
export function moteAt(
  mote: Mote,
  clock: number,
  width: number,
  height: number,
): { x: number; y: number; r: number } {
  const r = mote.r * width;
  const travel = height + r * 4;
  const progress = (mote.y + clock * mote.speed) % 1;

  return {
    x: mote.x * width + Math.sin(clock * 0.35 + mote.phase * 6.283) * mote.sway * width,
    y: progress * travel - r * 2,
    r,
  };
}

export interface Bunting {
  /** Where along the string this flag hangs, 0..1. */
  t: number;
  color: string;
}

const FLAG_COLORS = ["#E8A0A8", "#F2CE7E", "#9FD4C0", "#A8B6E8", "#E0B0D8"];

/** Paper flags strung across the top of the shop. */
export function buntingRow(count: number, seed = 77): Bunting[] {
  const rng = makeRng(seed);
  const flags: Bunting[] = [];

  for (let i = 0; i < count; i++) {
    flags.push({
      t: (i + 0.5) / count,
      color: FLAG_COLORS[rng.int(FLAG_COLORS.length)],
    });
  }

  return flags;
}

/**
 * Sag of the bunting string at position `t`, 0..1 of its span, plus a slow
 * sway so the whole line breathes rather than hanging dead.
 */
export function buntingSag(t: number, clock: number): number {
  const droop = Math.sin(t * Math.PI);
  return droop * (1 + Math.sin(clock * 0.7 + t * 3) * 0.06);
}
