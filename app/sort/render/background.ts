import { makeRng } from "@/app/game/_shared/rng";

export interface Bubble {
  /** Horizontal position, 0..1 of canvas width. */
  x: number;
  /** Radius as a fraction of canvas width. */
  r: number;
  /** Rises this fraction of the canvas per second. */
  speed: number;
  /** Offset into its own cycle, so they do not all start at the floor. */
  phase: number;
  /** Horizontal sway, as a fraction of canvas width. */
  sway: number;
  alpha: number;
}

export interface Sparkle {
  x: number;
  y: number;
  r: number;
  /** Twinkles per second. */
  rate: number;
  phase: number;
}

/**
 * The drifting bubbles behind the shelves.
 *
 * Seeded rather than random so the field is identical on every mount — a
 * background that reshuffles whenever the component remounts reads as a glitch,
 * and a deterministic one can also be asserted on.
 */
export function bubbleField(count: number, seed = 1337): Bubble[] {
  const rng = makeRng(seed);
  const bubbles: Bubble[] = [];

  for (let i = 0; i < count; i++) {
    bubbles.push({
      x: rng.next(),
      r: 0.006 + rng.next() * 0.022,
      speed: 0.018 + rng.next() * 0.05,
      phase: rng.next(),
      sway: 0.008 + rng.next() * 0.03,
      alpha: 0.05 + rng.next() * 0.09,
    });
  }

  return bubbles;
}

export function sparkleField(count: number, seed = 99): Sparkle[] {
  const rng = makeRng(seed);
  const sparkles: Sparkle[] = [];

  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: rng.next(),
      y: rng.next(),
      r: 0.0012 + rng.next() * 0.0028,
      rate: 0.25 + rng.next() * 0.7,
      phase: rng.next(),
    });
  }

  return sparkles;
}

/**
 * Where a bubble sits at time `clock`, in canvas pixels.
 *
 * Rises forever by wrapping its cycle, so there is no moment where the field
 * restarts. Radius is folded into the wrap so a bubble leaves the top and
 * re-enters below the bottom rather than popping into existence on screen.
 */
export function bubbleAt(
  bubble: Bubble,
  clock: number,
  width: number,
  height: number,
): { x: number; y: number; r: number } {
  const r = bubble.r * width;
  const travel = height + r * 4;
  const progress = (bubble.phase + clock * bubble.speed) % 1;

  return {
    x: bubble.x * width + Math.sin((clock * 0.6 + bubble.phase * 6.283)) * bubble.sway * width,
    y: height + r * 2 - progress * travel,
    r,
  };
}

/** Twinkle brightness, 0..1. */
export function sparkleAlpha(sparkle: Sparkle, clock: number): number {
  const wave = Math.sin((clock * sparkle.rate + sparkle.phase) * Math.PI * 2);
  return Math.max(0, wave) ** 2;
}
