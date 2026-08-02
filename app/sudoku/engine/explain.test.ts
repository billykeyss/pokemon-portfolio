import { describe, expect, it } from "vitest";
import { cellName, explain, unitName } from "./explain";
import type { Deduction } from "./techniques";

const SAMPLES: Deduction[] = [
  { kind: "naked-single", cell: 8, digit: 9 },
  { kind: "hidden-single", cell: 20, digit: 7, unit: { kind: "box", index: 0 }, because: [18, 28] },
  {
    kind: "locked-candidates",
    digit: 4,
    box: { kind: "box", index: 0 },
    line: { kind: "row", index: 0 },
    cells: [0, 1],
    removes: [{ cell: 4, digit: 4 }],
  },
  {
    kind: "naked-subset",
    cells: [0, 1],
    digits: [3, 8],
    unit: { kind: "row", index: 0 },
    removes: [{ cell: 4, digit: 3 }],
  },
  {
    kind: "hidden-subset",
    cells: [0, 1],
    digits: [1, 2],
    unit: { kind: "row", index: 0 },
    removes: [{ cell: 0, digit: 5 }],
  },
  {
    kind: "x-wing",
    digit: 4,
    cells: [0, 3, 63, 66],
    lines: [{ kind: "row", index: 0 }, { kind: "row", index: 7 }],
    covers: [{ kind: "col", index: 0 }, { kind: "col", index: 3 }],
    removes: [{ cell: 27, digit: 4 }],
  },
];

describe("cellName", () => {
  it("names cells the way players read them", () => {
    expect(cellName(0)).toBe("r1c1");
    expect(cellName(80)).toBe("r9c9");
    expect(cellName(20)).toBe("r3c3");
  });
});

describe("unitName", () => {
  it("names units in one-based terms", () => {
    expect(unitName({ kind: "row", index: 0 })).toBe("row 1");
    expect(unitName({ kind: "col", index: 8 })).toBe("column 9");
    expect(unitName({ kind: "box", index: 4 })).toBe("box 5");
  });
});

describe("explain", () => {
  it("gives every deduction a headline and a body", () => {
    for (const d of SAMPLES) {
      const e = explain(d);
      expect(e.headline.length).toBeGreaterThan(0);
      expect(e.body.length).toBeGreaterThan(20);
    }
  });

  it("only ever names cells that are on the board", () => {
    for (const d of SAMPLES) {
      for (const i of explain(d).highlight.cells) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(81);
      }
    }
  });

  it("puts the deduction's own cells in the highlight", () => {
    const e = explain(SAMPLES[0]);
    expect(e.highlight.cells).toContain(8);
  });

  it("carries every elimination through to the highlight", () => {
    const e = explain(SAMPLES[2]);
    expect(e.highlight.eliminated).toEqual([{ cell: 4, digit: 4 }]);
  });

  it("mentions the digit it is about", () => {
    expect(explain(SAMPLES[1]).body).toContain("7");
  });
});
