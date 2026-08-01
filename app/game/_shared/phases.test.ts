import { describe, expect, it } from "vitest";
import { ease, timelineAt, timelineDuration, type Phase } from "./phases";

type Name = "in" | "hold" | "out";

const TIMELINE: readonly Phase<Name>[] = [
  { name: "in", dur: 0.2 },
  { name: "hold", dur: 0.5 },
  { name: "out", dur: 0.3 },
];

describe("timelineDuration", () => {
  it("sums the phases", () => {
    expect(timelineDuration(TIMELINE)).toBeCloseTo(1);
  });

  it("is zero for an empty timeline", () => {
    expect(timelineDuration([])).toBe(0);
  });
});

describe("timelineAt", () => {
  it("starts at the first phase with no progress", () => {
    expect(timelineAt(TIMELINE, 0)).toEqual({ name: "in", u: 0, index: 0 });
  });

  it("reports progress within the current phase", () => {
    const at = timelineAt(TIMELINE, 0.1);
    expect(at.name).toBe("in");
    expect(at.u).toBeCloseTo(0.5);
  });

  it("crosses into the next phase at the boundary", () => {
    expect(timelineAt(TIMELINE, 0.2).name).toBe("hold");
  });

  it("clamps negative time to the start", () => {
    expect(timelineAt(TIMELINE, -5)).toEqual({ name: "in", u: 0, index: 0 });
  });

  it("clamps past the end to the last phase complete", () => {
    expect(timelineAt(TIMELINE, 99)).toEqual({ name: "out", u: 1, index: 2 });
  });

  it("visits every phase in order as time advances", () => {
    const seen: Name[] = [];
    const total = timelineDuration(TIMELINE);
    for (let t = 0; t <= total; t += total / 200) {
      const { name } = timelineAt(TIMELINE, t);
      if (seen[seen.length - 1] !== name) seen.push(name);
    }
    expect(seen).toEqual(["in", "hold", "out"]);
  });

  it("skips a zero-length phase rather than dividing by zero", () => {
    const phases: readonly Phase<Name>[] = [
      { name: "in", dur: 0 },
      { name: "hold", dur: 0.4 },
    ];
    const at = timelineAt(phases, 0);
    expect(at.name).toBe("hold");
    expect(Number.isFinite(at.u)).toBe(true);
  });

  it("throws on an empty timeline rather than returning nonsense", () => {
    expect(() => timelineAt([], 0)).toThrow();
  });
});

describe("ease", () => {
  it("pins both ends", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("passes through the midpoint", () => {
    expect(ease(0.5)).toBeCloseTo(0.5);
  });

  it("clamps out-of-range input", () => {
    expect(ease(-2)).toBe(0);
    expect(ease(4)).toBe(1);
  });

  it("is monotonic", () => {
    let previous = -1;
    for (let u = 0; u <= 1; u += 0.05) {
      const value = ease(u);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
