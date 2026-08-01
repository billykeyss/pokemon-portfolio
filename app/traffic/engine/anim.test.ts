import { describe, expect, it } from "vitest";
import {
  advanceSlide,
  exitDuration,
  exitOffset,
  isSlideDone,
  slideDuration,
  slidePhases,
  slideProgress,
  startSlide,
} from "./anim";

const slide = (delta: number) => startSlide({ id: 0, delta });

describe("slidePhases", () => {
  it("runs slide then settle", () => {
    expect(slidePhases(2).map((p) => p.name)).toEqual(["slide", "settle"]);
  });

  it("takes longer for a longer slide", () => {
    expect(slideDuration(4)).toBeGreaterThan(slideDuration(1));
  });

  it("stays brisk even across the whole board", () => {
    // These puzzles are played in bursts; a slide you wait out kills the pace.
    expect(slideDuration(5)).toBeLessThan(0.5);
  });

  it("treats a zero-cell slide as one cell rather than an instant jump", () => {
    expect(slideDuration(0)).toBe(slideDuration(1));
  });
});

describe("slideProgress", () => {
  it("starts at zero", () => {
    expect(slideProgress(slide(2))).toBe(0);
  });

  it("reaches one by the end of the slide phase", () => {
    const phases = slidePhases(2);
    const s = advanceSlide(slide(2), phases[0].dur);
    expect(slideProgress(s)).toBe(1);
  });

  it("holds at one through settle rather than creeping past", () => {
    const s = advanceSlide(slide(2), slideDuration(2) * 0.99);
    expect(slideProgress(s)).toBe(1);
  });

  it("stays within bounds for the whole animation", () => {
    const total = slideDuration(3);
    for (let t = 0; t <= total; t += total / 40) {
      const p = slideProgress(advanceSlide(slide(3), t));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("advances monotonically", () => {
    const total = slideDuration(3);
    let previous = -1;
    for (let t = 0; t <= total; t += total / 40) {
      const p = slideProgress(advanceSlide(slide(3), t));
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
  });

  it("is direction-agnostic — the sign lives in the move", () => {
    const forward = slideProgress(advanceSlide(slide(2), 0.08));
    const back = slideProgress(advanceSlide(slide(-2), 0.08));
    expect(forward).toBeCloseTo(back);
  });
});

describe("advanceSlide / isSlideDone", () => {
  it("is not done at the start", () => {
    expect(isSlideDone(slide(1))).toBe(false);
  });

  it("is done once the duration has elapsed", () => {
    expect(isSlideDone(advanceSlide(slide(1), slideDuration(1)))).toBe(true);
  });

  it("does not mutate the slide it advances", () => {
    const s = slide(1);
    advanceSlide(s, 0.5);
    expect(s.t).toBe(0);
  });

  it("keeps the move it was given", () => {
    expect(advanceSlide(startSlide({ id: 4, delta: -3 }), 0.1).move).toEqual({
      id: 4,
      delta: -3,
    });
  });
});

describe("exitOffset", () => {
  it("holds still during the pause, so the win registers before the car goes", () => {
    expect(exitOffset(0, 6)).toBe(0);
    expect(exitOffset(0.1, 6)).toBe(0);
  });

  it("ends up clear of the board", () => {
    expect(exitOffset(exitDuration(), 6)).toBeGreaterThan(6);
  });

  it("accelerates rather than easing out — the car is leaving, not arriving", () => {
    const early = exitOffset(0.25, 6) - exitOffset(0.2, 6);
    const late = exitOffset(0.6, 6) - exitOffset(0.55, 6);
    expect(late).toBeGreaterThan(early);
  });

  it("never moves backwards", () => {
    let previous = -1;
    const total = exitDuration();
    for (let t = 0; t <= total; t += total / 40) {
      const offset = exitOffset(t, 6);
      expect(offset).toBeGreaterThanOrEqual(previous);
      previous = offset;
    }
  });
});
