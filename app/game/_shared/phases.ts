/**
 * A named sequence of timed animation phases.
 *
 * Every game here animates the same way: a move commits instantly in logic, and
 * the renderer walks a scripted timeline to catch up. Keeping the timeline pure
 * means the interesting part — which phase are we in, how far through — is
 * testable without a canvas, and the renderer only reads.
 */
export interface Phase<N extends string> {
  name: N;
  /** Seconds. */
  dur: number;
}

export interface PhaseAt<N extends string> {
  name: N;
  /** Progress within this phase, 0..1. */
  u: number;
  index: number;
}

export function timelineDuration<N extends string>(phases: readonly Phase<N>[]): number {
  return phases.reduce((total, phase) => total + phase.dur, 0);
}

/**
 * Which phase a timeline is in at time `t`. Clamps at both ends: before the
 * start is the first phase at 0, past the end is the last phase at 1, so a
 * caller can never index off the timeline.
 */
export function timelineAt<N extends string>(
  phases: readonly Phase<N>[],
  t: number,
): PhaseAt<N> {
  if (phases.length === 0) throw new Error("timelineAt: empty timeline");

  let remaining = Math.max(0, t);
  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    if (remaining < phase.dur) {
      return { name: phase.name, u: phase.dur === 0 ? 1 : remaining / phase.dur, index };
    }
    remaining -= phase.dur;
  }

  const last = phases.length - 1;
  return { name: phases[last].name, u: 1, index: last };
}

/** Smoothstep. Six phases do not justify an easing library. */
export function ease(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}
