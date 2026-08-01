import { describe, expect, it } from "vitest";
import {
  advance,
  isDone,
  phaseAt,
  phaseDurations,
  pouredUnits,
  sincePour,
  startPour,
  surfaceWobble,
  tiltAngle,
  totalDuration,
  travelArc,
  WOBBLE_DURATION,
} from "./anim";

describe("phaseDurations", () => {
  it("runs the six phases in order", () => {
    expect(phaseDurations(2).map((p) => p.name)).toEqual([
      "lift",
      "travel",
      "tilt",
      "pour",
      "untilt",
      "return",
    ]);
  });

  it("scales only the pour phase with unit count", () => {
    const one = phaseDurations(1);
    const three = phaseDurations(3);
    const pourOf = (ps: typeof one) => ps.find((p) => p.name === "pour")?.dur ?? 0;

    expect(pourOf(three)).toBeCloseTo(pourOf(one) * 3);
    expect(one.find((p) => p.name === "lift")?.dur).toBe(
      three.find((p) => p.name === "lift")?.dur,
    );
  });

  it("gives every phase a positive duration", () => {
    expect(phaseDurations(1).every((p) => p.dur > 0)).toBe(true);
  });
});

describe("totalDuration", () => {
  it("sums the phases", () => {
    const sum = phaseDurations(2).reduce((n, p) => n + p.dur, 0);
    expect(totalDuration(2)).toBeCloseTo(sum);
  });

  it("grows with unit count", () => {
    expect(totalDuration(4)).toBeGreaterThan(totalDuration(1));
  });

  it("stays under a second even for a full-bottle pour", () => {
    // A pour the player has to sit through is worse than one they barely catch.
    expect(totalDuration(4)).toBeLessThan(1);
  });
});

describe("phaseAt", () => {
  it("starts in lift at zero progress", () => {
    expect(phaseAt(0, 2)).toEqual({ name: "lift", u: 0, index: 0 });
  });

  it("clamps past the end to the final phase complete", () => {
    expect(phaseAt(totalDuration(2) + 5, 2)).toEqual({
      name: "return",
      u: 1,
      index: 5,
    });
  });

  it("treats negative time as the start", () => {
    expect(phaseAt(-1, 2)).toEqual({ name: "lift", u: 0, index: 0 });
  });

  it("reports progress within the current phase", () => {
    const lift = phaseDurations(2)[0].dur;
    const at = phaseAt(lift / 2, 2);
    expect(at.name).toBe("lift");
    expect(at.u).toBeCloseTo(0.5);
  });

  it("crosses phase boundaries in order as time advances", () => {
    const seen: string[] = [];
    const total = totalDuration(2);
    for (let t = 0; t <= total; t += total / 120) {
      const { name } = phaseAt(t, 2);
      if (seen[seen.length - 1] !== name) seen.push(name);
    }
    expect(seen).toEqual(["lift", "travel", "tilt", "pour", "untilt", "return"]);
  });
});

describe("pouredUnits", () => {
  it("is zero before the pour phase", () => {
    expect(pouredUnits(startPour({ from: 0, to: 1 }, 3, 0))).toBe(0);
  });

  it("is still zero at the very end of the tilt phase", () => {
    const beforePour = phaseDurations(3)
      .slice(0, 3)
      .reduce((n, p) => n + p.dur, 0);
    const pour = advance(startPour({ from: 0, to: 1 }, 3, 0), beforePour * 0.999);
    expect(pouredUnits(pour)).toBe(0);
  });

  it("is the full count after the pour phase", () => {
    const pour = advance(startPour({ from: 0, to: 1 }, 3, 0), totalDuration(3));
    expect(pouredUnits(pour)).toBe(3);
  });

  it("is fractional mid-pour, so flow reads as continuous", () => {
    const phases = phaseDurations(2);
    const beforePour = phases.slice(0, 3).reduce((n, p) => n + p.dur, 0);
    const pour = advance(
      startPour({ from: 0, to: 1 }, 2, 0),
      beforePour + phases[3].dur / 2,
    );
    expect(pouredUnits(pour)).toBeCloseTo(1);
  });

  it("never exceeds the units in flight", () => {
    const total = totalDuration(4);
    for (let t = 0; t <= total; t += total / 50) {
      const pour = advance(startPour({ from: 0, to: 1 }, 4, 0), t);
      expect(pouredUnits(pour)).toBeLessThanOrEqual(4);
      expect(pouredUnits(pour)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("tiltAngle", () => {
  it("tips a nearly empty bottle further than a full one", () => {
    expect(Math.abs(tiltAngle(1, 4))).toBeGreaterThan(Math.abs(tiltAngle(4, 4)));
  });

  it("always tips past a right angle, or nothing would pour out", () => {
    for (let remaining = 0; remaining <= 4; remaining++) {
      expect(tiltAngle(remaining, 4)).toBeGreaterThan(Math.PI / 2);
    }
  });

  it("returns an unsigned magnitude, leaving direction to the caller", () => {
    for (let remaining = 0; remaining <= 4; remaining++) {
      expect(tiltAngle(remaining, 4)).toBeGreaterThan(0);
    }
  });

  it("is monotonic in remaining fill", () => {
    const angles = [1, 2, 3, 4].map((r) => Math.abs(tiltAngle(r, 4)));
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    }
  });

  it("clamps out-of-range fill rather than over-rotating", () => {
    expect(tiltAngle(-3, 4)).toBe(tiltAngle(0, 4));
    expect(tiltAngle(99, 4)).toBe(tiltAngle(4, 4));
  });
});

describe("advance / isDone", () => {
  it("is not done at the start", () => {
    expect(isDone(startPour({ from: 0, to: 1 }, 1, 0))).toBe(false);
  });

  it("is done once the total duration has elapsed", () => {
    const p = advance(startPour({ from: 0, to: 1 }, 1, 0), totalDuration(1));
    expect(isDone(p)).toBe(true);
  });

  it("does not mutate the pour it advances", () => {
    const p = startPour({ from: 0, to: 1 }, 1, 0);
    advance(p, 0.5);
    expect(p.t).toBe(0);
  });

  it("preserves the move and colour it was given", () => {
    const p = advance(startPour({ from: 2, to: 5 }, 3, 7), 0.2);
    expect(p.move).toEqual({ from: 2, to: 5 });
    expect(p.color).toBe(7);
    expect(p.units).toBe(3);
  });
});

describe("travelArc", () => {
  it("is flat at both ends", () => {
    expect(travelArc(0)).toBeCloseTo(0);
    expect(travelArc(1)).toBeCloseTo(0);
  });

  it("lifts the bottle in between", () => {
    expect(travelArc(0.5)).toBeGreaterThan(0.8);
  });

  it("never dips below the straight path", () => {
    for (let u = 0; u <= 1; u += 0.05) {
      expect(travelArc(u)).toBeGreaterThanOrEqual(0);
    }
  });

  it("peaks before halfway, so the bottle settles rather than drops", () => {
    let peak = 0;
    let peakAt = 0;
    for (let u = 0; u <= 1; u += 0.01) {
      const v = travelArc(u);
      if (v > peak) {
        peak = v;
        peakAt = u;
      }
    }
    expect(peakAt).toBeLessThan(0.5);
  });

  it("clamps outside its range", () => {
    expect(travelArc(-3)).toBeCloseTo(0);
    expect(travelArc(9)).toBeCloseTo(0);
  });
});

describe("surfaceWobble", () => {
  it("is zero before it starts and after it settles", () => {
    expect(surfaceWobble(-1)).toBe(0);
    expect(surfaceWobble(WOBBLE_DURATION)).toBe(0);
    expect(surfaceWobble(WOBBLE_DURATION * 3)).toBe(0);
  });

  it("oscillates — crossing zero in both directions", () => {
    const samples = [];
    for (let t = 0; t < WOBBLE_DURATION; t += WOBBLE_DURATION / 60) {
      samples.push(surfaceWobble(t));
    }
    expect(samples.some((v) => v > 0.01)).toBe(true);
    expect(samples.some((v) => v < -0.01)).toBe(true);
  });

  it("damps, so later swings are smaller than earlier ones", () => {
    const early = Math.abs(surfaceWobble(WOBBLE_DURATION * 0.12));
    const late = Math.abs(surfaceWobble(WOBBLE_DURATION * 0.85));
    expect(late).toBeLessThan(early);
  });

  it("stays a small fraction of a unit — a slosh, not a jump", () => {
    for (let t = 0; t < WOBBLE_DURATION; t += WOBBLE_DURATION / 60) {
      expect(Math.abs(surfaceWobble(t))).toBeLessThan(0.25);
    }
  });
});

describe("sincePour", () => {
  it("is null while liquid is still falling", () => {
    expect(sincePour(startPour({ from: 0, to: 1 }, 2, 0))).toBeNull();

    const midPour = phaseDurations(2)
      .slice(0, 3)
      .reduce((n, p) => n + p.dur, 0);
    expect(sincePour(advance(startPour({ from: 0, to: 1 }, 2, 0), midPour + 0.01))).toBeNull();
  });

  it("starts counting once the pour phase ends", () => {
    const pourEnds = phaseDurations(2)
      .slice(0, 4)
      .reduce((n, p) => n + p.dur, 0);
    const after = sincePour(advance(startPour({ from: 0, to: 1 }, 2, 0), pourEnds + 0.05));
    expect(after).not.toBeNull();
    expect(after ?? -1).toBeCloseTo(0.05);
  });

  it("keeps growing through the end of the animation", () => {
    const done = sincePour(advance(startPour({ from: 0, to: 1 }, 2, 0), totalDuration(2)));
    expect(done ?? -1).toBeGreaterThan(0);
  });
});
