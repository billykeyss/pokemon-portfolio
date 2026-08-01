"use client";

import { useEffect, useRef } from "react";

interface GameLoopOptions {
  /** Advance the simulation by exactly fixedDt. */
  step: () => void;
  /** Paint. `alpha` is the interpolation factor into the next step, 0..1. */
  draw: (alpha: number) => void;
  fixedDt: number;
  running: boolean;
  /** Simulated seconds per real second. 1 = normal. */
  speed?: number;
}

/**
 * Maximum simulated seconds per frame — prevents a spiral of death after a
 * long tab-switch, where a huge dt would queue thousands of catch-up steps.
 */
const MAX_FRAME_TIME = 0.25;

/**
 * Hard ceiling on simulation steps per rendered frame. At 10x a slow frame
 * could otherwise queue hundreds of steps, and the O(n^2) pair loop would make
 * the next frame slower still — the classic spiral.
 */
const MAX_STEPS_PER_FRAME = 400;

export function useGameLoop({
  step,
  draw,
  fixedDt,
  running,
  speed = 1,
}: GameLoopOptions): void {
  const stepRef = useRef(step);
  const drawRef = useRef(draw);

  // Keep the latest closures without restarting the loop on every render.
  useEffect(() => {
    stepRef.current = step;
    drawRef.current = draw;
  }, [step, draw]);

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;

      let elapsed = (now - last) / 1000;
      last = now;
      if (elapsed > MAX_FRAME_TIME) elapsed = MAX_FRAME_TIME;

      // Speeding up simply hands the accumulator more simulated time; the
      // step size never changes, so physics is identical at every speed.
      accumulator += elapsed * speed;

      let steps = 0;
      while (accumulator >= fixedDt && steps < MAX_STEPS_PER_FRAME) {
        stepRef.current();
        accumulator -= fixedDt;
        steps += 1;
      }
      // Drop any backlog we could not work through rather than compounding it.
      if (steps >= MAX_STEPS_PER_FRAME) accumulator = 0;

      drawRef.current(accumulator / fixedDt);
      frame = requestAnimationFrame(tick);
    };

    // A backgrounded tab stops firing rAF; reset the clock on return so the
    // accumulator does not see a multi-minute delta.
    const onVisibility = () => {
      if (!document.hidden) {
        last = performance.now();
        accumulator = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, fixedDt, speed]);
}
