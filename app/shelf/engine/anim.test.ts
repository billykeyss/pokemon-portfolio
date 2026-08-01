import { describe, expect, it } from "vitest";
import {
  advanceFly,
  flyArc,
  flyDuration,
  FLY_PHASES,
  flyProgress,
  isFlyDone,
  liftAmount,
  POP_DURATION,
  popScale,
  startFly,
} from "./anim";

const fly = () => startFly(2, 1, 0);
const at = (t: number) => advanceFly(fly(), t);

describe("FLY_PHASES", () => {
  it("lifts, flies, then lands", () => {
    expect(FLY_PHASES.map((p) => p.name)).toEqual(["lift", "fly", "land"]);
  });

  it("stays brisk — this game is played in fast taps", () => {
    expect(flyDuration()).toBeLessThan(0.45);
  });
});

describe("flyProgress", () => {
  it("holds at zero through the lift, so the item leaves the shelf first", () => {
    expect(flyProgress(at(0))).toBe(0);
    expect(flyProgress(at(FLY_PHASES[0].dur * 0.9))).toBe(0);
  });

  it("pins at one through the landing rather than drifting past", () => {
    expect(flyProgress(at(flyDuration() * 0.99))).toBe(1);
    expect(flyProgress(at(flyDuration() + 1))).toBe(1);
  });

  it("is mid-way at the middle of the fly phase", () => {
    const t = FLY_PHASES[0].dur + FLY_PHASES[1].dur / 2;
    expect(flyProgress(at(t))).toBeCloseTo(0.5);
  });

  it("advances monotonically and stays in range", () => {
    let previous = -1;
    const total = flyDuration();
    for (let t = 0; t <= total; t += total / 40) {
      const p = flyProgress(at(t));
      expect(p).toBeGreaterThanOrEqual(previous);
      expect(p).toBeLessThanOrEqual(1);
      previous = p;
    }
  });
});

describe("flyArc", () => {
  it("is flat at both ends and highest in the middle", () => {
    expect(flyArc(at(0))).toBeCloseTo(0);
    expect(flyArc(at(flyDuration()))).toBeCloseTo(0);

    const mid = FLY_PHASES[0].dur + FLY_PHASES[1].dur / 2;
    expect(flyArc(at(mid))).toBeGreaterThan(0.9);
  });

  it("never goes negative — the item arcs up, not down", () => {
    const total = flyDuration();
    for (let t = 0; t <= total; t += total / 30) {
      expect(flyArc(at(t))).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("liftAmount", () => {
  it("rises during the lift and stays up afterwards", () => {
    expect(liftAmount(at(0))).toBe(0);
    expect(liftAmount(at(FLY_PHASES[0].dur))).toBe(1);
    expect(liftAmount(at(flyDuration()))).toBe(1);
  });
});

describe("isFlyDone", () => {
  it("is false at the start and true at the end", () => {
    expect(isFlyDone(fly())).toBe(false);
    expect(isFlyDone(at(flyDuration()))).toBe(true);
  });

  it("does not mutate the fly it advances", () => {
    const f = fly();
    advanceFly(f, 0.2);
    expect(f.t).toBe(0);
  });

  it("keeps the item and its destination", () => {
    const f = advanceFly(startFly(5, 2, 3), 0.1);
    expect(f).toMatchObject({ type: 5, fromColumn: 2, toSlot: 3 });
  });
});

describe("popScale", () => {
  it("starts at full size", () => {
    expect(popScale(0)).toBeCloseTo(1);
  });

  it("swells before it shrinks", () => {
    expect(popScale(POP_DURATION * 0.3)).toBeGreaterThan(1);
  });

  it("ends at nothing", () => {
    expect(popScale(POP_DURATION)).toBeCloseTo(0);
  });

  it("never goes negative, however far past the end it is asked", () => {
    expect(popScale(POP_DURATION * 5)).toBeGreaterThanOrEqual(0);
  });
});
