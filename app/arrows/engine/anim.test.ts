import { describe, expect, it } from "vitest";
import {
  advanceFlight,
  advanceRebuff,
  flightAlpha,
  flightDuration,
  flightOffset,
  flightPhases,
  isFlightDone,
  isRebuffDone,
  REBUFF_DURATION,
  rebuffGlow,
  rebuffShake,
  startFlight,
  startRebuff,
} from "./anim";
import type { Arrow } from "./types";

const arrow: Arrow = { id: 0, cells: [{ row: 2, col: 2 }], dir: 1, hue: 0 };
const flight = (distance = 3) => startFlight(arrow, distance);
const at = (t: number, distance = 3) => advanceFlight(flight(distance), t);

describe("flightPhases", () => {
  it("winds up, then flies", () => {
    expect(flightPhases(3).map((p) => p.name)).toEqual(["wind", "fly"]);
  });

  it("takes longer for a longer trip", () => {
    expect(flightDuration(6)).toBeGreaterThan(flightDuration(1));
  });

  it("stays brisk even across a full board", () => {
    // Every tap pays this; a board is cleared one arrow at a time.
    expect(flightDuration(7)).toBeLessThan(0.4);
  });

  it("treats a zero-cell trip as one cell rather than an instant blink", () => {
    expect(flightDuration(0)).toBe(flightDuration(1));
  });
});

describe("flightOffset", () => {
  it("recoils backwards before launching", () => {
    const winding = flightOffset(at(flightPhases(3)[0].dur * 0.8));
    expect(winding).toBeLessThan(0);
  });

  it("ends clear of the board", () => {
    expect(flightOffset(at(flightDuration(3)))).toBeGreaterThan(3);
  });

  it("accelerates rather than easing out", () => {
    const phases = flightPhases(3);
    const start = phases[0].dur;
    const early = flightOffset(at(start + phases[1].dur * 0.3)) -
      flightOffset(at(start + phases[1].dur * 0.2));
    const late = flightOffset(at(start + phases[1].dur * 0.9)) -
      flightOffset(at(start + phases[1].dur * 0.8));
    expect(late).toBeGreaterThan(early);
  });

  it("never moves backwards once it has launched", () => {
    const total = flightDuration(4);
    let previous = -Infinity;
    for (let t = flightPhases(4)[0].dur; t <= total; t += total / 40) {
      const offset = flightOffset(at(t, 4));
      expect(offset).toBeGreaterThanOrEqual(previous);
      previous = offset;
    }
  });
});

describe("flightAlpha", () => {
  it("is solid through the wind-up", () => {
    expect(flightAlpha(at(0))).toBe(1);
  });

  it("has faded out by the end", () => {
    expect(flightAlpha(at(flightDuration(3)))).toBeCloseTo(0);
  });

  it("never leaves the range", () => {
    const total = flightDuration(3);
    for (let t = 0; t <= total; t += total / 40) {
      const a = flightAlpha(at(t));
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });
});

describe("isFlightDone", () => {
  it("is false at the start and true at the end", () => {
    expect(isFlightDone(flight())).toBe(false);
    expect(isFlightDone(at(flightDuration(3)))).toBe(true);
  });

  it("does not mutate the flight it advances", () => {
    const f = flight();
    advanceFlight(f, 0.2);
    expect(f.t).toBe(0);
  });

  it("keeps the arrow it was given", () => {
    expect(advanceFlight(flight(), 0.1).arrow).toEqual(arrow);
  });
});

describe("rebuffShake", () => {
  it("is still before and after", () => {
    expect(rebuffShake(-1)).toBe(0);
    expect(rebuffShake(REBUFF_DURATION)).toBe(0);
    expect(rebuffShake(REBUFF_DURATION * 4)).toBe(0);
  });

  it("jolts both ways", () => {
    const samples = [];
    for (let t = 0; t < REBUFF_DURATION; t += REBUFF_DURATION / 60) {
      samples.push(rebuffShake(t));
    }
    expect(samples.some((v) => v > 0.01)).toBe(true);
    expect(samples.some((v) => v < -0.01)).toBe(true);
  });

  it("damps, so later swings are smaller", () => {
    const early = Math.abs(rebuffShake(REBUFF_DURATION * 0.1));
    const late = Math.abs(rebuffShake(REBUFF_DURATION * 0.85));
    expect(late).toBeLessThan(early);
  });

  it("stays a nudge, not a leap", () => {
    for (let t = 0; t < REBUFF_DURATION; t += REBUFF_DURATION / 60) {
      expect(Math.abs(rebuffShake(t))).toBeLessThan(0.2);
    }
  });
});

describe("rebuffGlow", () => {
  it("starts bright and fades to nothing", () => {
    expect(rebuffGlow(0)).toBeCloseTo(1);
    expect(rebuffGlow(REBUFF_DURATION)).toBe(0);
  });

  it("only decreases", () => {
    let previous = Infinity;
    for (let t = 0; t < REBUFF_DURATION; t += REBUFF_DURATION / 40) {
      const g = rebuffGlow(t);
      expect(g).toBeLessThanOrEqual(previous);
      previous = g;
    }
  });
});

describe("advanceRebuff / isRebuffDone", () => {
  it("runs out after its duration", () => {
    const r = startRebuff(1, 2);
    expect(isRebuffDone(r)).toBe(false);
    expect(isRebuffDone(advanceRebuff(r, REBUFF_DURATION))).toBe(true);
  });

  it("remembers who blocked whom", () => {
    const r = advanceRebuff(startRebuff(4, 9), 0.1);
    expect(r).toMatchObject({ id: 4, blockerId: 9 });
  });
});
