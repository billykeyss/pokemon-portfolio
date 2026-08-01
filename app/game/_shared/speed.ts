/**
 * Playback speed for the simulation. The sim always advances in FIXED_DT
 * increments — speeding up feeds the accumulator more simulated time per
 * frame, so physics stays identical and only the wall-clock pace changes.
 */
export const SPEEDS = [1, 2, 4, 10] as const;
export type Speed = (typeof SPEEDS)[number];
export const DEFAULT_SPEED: Speed = 1;

/** Cycle to the next speed, wrapping back to 1x. */
export function nextSpeed(current: number): Speed {
  const i = SPEEDS.indexOf(current as Speed);
  return SPEEDS[(i + 1) % SPEEDS.length];
}

/** Coerce anything (a stale save, a hand-edited value) to a valid speed. */
export function coerceSpeed(value: unknown): Speed {
  return SPEEDS.includes(value as Speed) ? (value as Speed) : DEFAULT_SPEED;
}
