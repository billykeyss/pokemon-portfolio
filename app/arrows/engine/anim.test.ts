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
  flightRoute,
  sampleTrack,
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

  it("stays bounded even across a full board", () => {
    // Deliberately unhurried — the flight is the payoff for reading the board
    // right — but still bounded, because every tap pays it and a board is
    // cleared one arrow at a time.
    expect(flightDuration(7)).toBeLessThan(0.9);
    expect(flightDuration(7)).toBeGreaterThan(0.5);
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

  it("launches from where the recoil stopped, at the speed it stopped", () => {
    // Position and velocity both continuous across the boundary. A mismatch
    // here is a visible flick at exactly the moment the eye is on the arrow.
    const phases = flightPhases(4);
    const boundary = phases[0].dur;
    const step = phases[1].dur / 400;

    const before = flightOffset(at(boundary - step, 4));
    const atBoundary = flightOffset(at(boundary, 4));
    const after = flightOffset(at(boundary + step, 4));

    expect(atBoundary).toBeCloseTo(before, 2);

    // Speed either side of the seam, in cells per sample.
    const incoming = atBoundary - before;
    const outgoing = after - atBoundary;
    expect(Math.abs(outgoing - incoming)).toBeLessThan(0.01);
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

  it("eases into the fade rather than switching off", () => {
    // Sampled across the fade, no single step may drop a large chunk of the
    // opacity — that is what a linear fade starting at full rate looks like.
    const total = flightDuration(4);
    let previous = 1;
    let biggestDrop = 0;
    for (let t = 0; t <= total; t += total / 120) {
      const a = flightAlpha(at(t, 4));
      biggestDrop = Math.max(biggestDrop, previous - a);
      previous = a;
    }
    expect(biggestDrop).toBeLessThan(0.06);
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

/** An L-shaped arrow: east along row 2, then turning north up column 4. */
const bent = {
  id: 0,
  hue: 0,
  dir: 0 as const,
  cells: [
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 2, col: 4 },
    { row: 1, col: 4 },
  ],
};

const straight = {
  id: 1,
  hue: 0,
  dir: 1 as const,
  cells: [
    { row: 3, col: 1 },
    { row: 3, col: 2 },
  ],
};

const single = { id: 2, hue: 0, dir: 2 as const, cells: [{ row: 0, col: 0 }] };

describe("flightRoute", () => {
  it("contains the arrow's own cells, in order, at the base index", () => {
    const route = flightRoute(bent, 3);
    const body = route.track.slice(route.base, route.base + bent.cells.length);
    expect(body).toEqual(bent.cells.map((c) => ({ row: c.row, col: c.col })));
  });

  it("pads behind the tail along the first segment, not the head's direction", () => {
    // The tail runs east, so behind it is west — even though the head points
    // north. Padding by the head direction would jerk the recoil sideways.
    const route = flightRoute(bent, 3);
    expect(route.track[route.base - 1]).toEqual({ row: 2, col: 1 });
  });

  it("extends past the head along the direction it points", () => {
    const route = flightRoute(bent, 3);
    const past = route.track.slice(route.base + bent.cells.length);
    expect(past[0]).toEqual({ row: 0, col: 4 });
    expect(past[1]).toEqual({ row: -1, col: 4 });
  });

  it("gives a single-cell arrow a run-up opposite its head", () => {
    const route = flightRoute(single, 2);
    expect(route.track[route.base - 1]).toEqual({ row: -1, col: 0 });
  });

  it("travels forward along the track when the head leads", () => {
    expect(flightRoute(bent, 3, "head").sign).toBe(1);
  });

  it("travels backward along the same track when the tail leads", () => {
    // One orientation, two directions of travel — so cells[i] keeps meaning
    // the same thing whichever end is going first.
    const route = flightRoute(bent, 3, "tail");
    expect(route.sign).toBe(-1);
    const body = route.track.slice(route.base, route.base + bent.cells.length);
    expect(body).toEqual(bent.cells.map((c) => ({ row: c.row, col: c.col })));
  });

  it("puts the long run-out ahead of whichever end leads", () => {
    const head = flightRoute(bent, 6, "head");
    const tail = flightRoute(bent, 6, "tail");
    // Head-led: room past the head. Tail-led: room before the tail.
    expect(head.track.length - (head.base + bent.cells.length)).toBeGreaterThanOrEqual(6);
    expect(tail.base).toBeGreaterThanOrEqual(6);
  });
});

describe("sampleTrack", () => {
  const { track, base } = flightRoute(bent, 4);

  it("returns a cell exactly at whole indices", () => {
    expect(sampleTrack(track, base)).toEqual({ row: 2, col: 2 });
  });

  it("interpolates between neighbours", () => {
    expect(sampleTrack(track, base + 0.5)).toEqual({ row: 2, col: 2.5 });
  });

  it("turns the corner instead of cutting across it", () => {
    // Between (2,4) and (1,4) the sample must stay in column 4. A rigid shift
    // along the head direction would have moved the tail off its own route.
    const corner = sampleTrack(track, base + 2.5);
    expect(corner.col).toBe(4);
    expect(corner.row).toBeCloseTo(1.5);
  });

  it("clamps rather than extrapolating past either end", () => {
    expect(sampleTrack(track, -50)).toEqual(track[0]);
    expect(sampleTrack(track, 999)).toEqual(track[track.length - 1]);
  });

  it("survives an empty track", () => {
    expect(sampleTrack([], 3)).toEqual({ row: 0, col: 0 });
  });
});

describe("path following, end to end", () => {
  it("walks a bent arrow's tail through the same bend its head took", () => {
    const { track, base } = flightRoute(bent, 5);
    // The tail starts at index TRACK_PAD. Advance it far enough to reach the
    // corner the head turned at, and it must be in the column, not beside it.
    const tailAfter = sampleTrack(track, base + 2);
    expect(tailAfter).toEqual({ row: 2, col: 4 });

    const tailBeyond = sampleTrack(track, base + 3);
    expect(tailBeyond).toEqual({ row: 1, col: 4 });
  });

  it("moves a straight arrow along its axis, unchanged in the other", () => {
    const { track, base } = flightRoute(straight, 4);
    const moved = sampleTrack(track, base + 1.5);
    expect(moved.row).toBe(3);
    expect(moved.col).toBeCloseTo(2.5);
  });
});
