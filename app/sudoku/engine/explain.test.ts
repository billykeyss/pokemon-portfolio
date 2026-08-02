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
  {
    kind: "naked-subset",
    cells: [9, 10, 11],
    digits: [2, 5, 6],
    unit: { kind: "row", index: 1 },
    removes: [{ cell: 12, digit: 2 }, { cell: 13, digit: 5 }],
  },
  {
    kind: "hidden-subset",
    cells: [18, 19, 20],
    digits: [4, 7, 9],
    unit: { kind: "row", index: 2 },
    removes: [{ cell: 18, digit: 3 }, { cell: 19, digit: 6 }],
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

  describe("naked-single", () => {
    const d = SAMPLES[0];

    it("has correct units and digits in highlight", () => {
      const e = explain(d);
      expect(e.highlight.units).toEqual([]);
      expect(e.highlight.digits).toEqual([9]);
    });

    it("has no eliminations", () => {
      const e = explain(d);
      expect(e.highlight.eliminated).toEqual([]);
    });

    it("includes the cell in highlight", () => {
      const e = explain(d);
      expect(e.highlight.cells).toEqual([8]);
    });

    it("mentions the cell and digit in body", () => {
      const e = explain(d);
      expect(e.body).toContain("r1c9");
      expect(e.body).toContain("9");
    });
  });

  describe("hidden-single", () => {
    const d = SAMPLES[1];

    it("has correct units and digits in highlight", () => {
      const e = explain(d);
      expect(e.highlight.units).toEqual([{ kind: "box", index: 0 }]);
      expect(e.highlight.digits).toEqual([7]);
    });

    it("has no eliminations", () => {
      const e = explain(d);
      expect(e.highlight.eliminated).toEqual([]);
    });

    it("includes cell and because-cells in highlight", () => {
      const e = explain(d);
      expect(e.highlight.cells).toContain(20);
      expect(e.highlight.cells).toContain(18);
      expect(e.highlight.cells).toContain(28);
    });

    it("mentions the digit can only go in the cell", () => {
      const e = explain(d);
      expect(e.body).toContain("can only go in");
      expect(e.body).toContain("7");
    });
  });

  describe("locked-candidates", () => {
    const d = SAMPLES[2];

    it("has box and line in units (in that order)", () => {
      const e = explain(d);
      expect(e.highlight.units).toEqual([
        { kind: "box", index: 0 },
        { kind: "row", index: 0 },
      ]);
    });

    it("has correct digit in highlight", () => {
      const e = explain(d);
      expect(e.highlight.digits).toEqual([4]);
    });

    it("includes deduction cells in highlight", () => {
      const e = explain(d);
      expect(e.highlight.cells).toContain(0);
      expect(e.highlight.cells).toContain(1);
    });

    it("carries removes to eliminated", () => {
      const e = explain(d);
      expect(e.highlight.eliminated).toEqual([{ cell: 4, digit: 4 }]);
    });

    it("mentions the box and line in body", () => {
      const e = explain(d);
      expect(e.body).toContain("Inside box");
      expect(e.body).toContain("outside");
    });
  });

  describe("naked-subset", () => {
    const pair = SAMPLES[3];
    const triple = SAMPLES[6];

    it("uses correct headline for pair", () => {
      const e = explain(pair);
      expect(e.headline).toBe("Naked pair");
    });

    it("has correct units and digits for pair", () => {
      const e = explain(pair);
      expect(e.highlight.units).toEqual([{ kind: "row", index: 0 }]);
      expect(e.highlight.digits).toEqual([3, 8]);
    });

    it("includes cells in highlight for pair", () => {
      const e = explain(pair);
      expect(e.highlight.cells).toContain(0);
      expect(e.highlight.cells).toContain(1);
    });

    it("carries removes to eliminated for pair", () => {
      const e = explain(pair);
      expect(e.highlight.eliminated).toEqual([{ cell: 4, digit: 3 }]);
    });

    it("uses distinctive reasoning in body for pair", () => {
      const e = explain(pair);
      expect(e.body).toContain("Between them they use all");
    });

    it("uses correct headline for triple", () => {
      const e = explain(triple);
      expect(e.headline).toBe("Naked triple");
    });

    it("has correct units and digits for triple", () => {
      const e = explain(triple);
      expect(e.highlight.units).toEqual([{ kind: "row", index: 1 }]);
      expect(e.highlight.digits).toEqual([2, 5, 6]);
    });

    it("includes cells in highlight for triple", () => {
      const e = explain(triple);
      expect(e.highlight.cells).toContain(9);
      expect(e.highlight.cells).toContain(10);
      expect(e.highlight.cells).toContain(11);
    });

    it("carries removes to eliminated for triple", () => {
      const e = explain(triple);
      expect(e.highlight.eliminated).toEqual([
        { cell: 12, digit: 2 },
        { cell: 13, digit: 5 },
      ]);
    });

    it("uses distinctive reasoning in body for triple", () => {
      const e = explain(triple);
      expect(e.body).toContain("Between them they use all");
    });
  });

  describe("hidden-subset", () => {
    const pair = SAMPLES[4];
    const triple = SAMPLES[7];

    it("uses correct headline for pair", () => {
      const e = explain(pair);
      expect(e.headline).toBe("Hidden pair");
    });

    it("has correct units and digits for pair", () => {
      const e = explain(pair);
      expect(e.highlight.units).toEqual([{ kind: "row", index: 0 }]);
      expect(e.highlight.digits).toEqual([1, 2]);
    });

    it("includes cells in highlight for pair", () => {
      const e = explain(pair);
      expect(e.highlight.cells).toContain(0);
      expect(e.highlight.cells).toContain(1);
    });

    it("carries removes to eliminated for pair", () => {
      const e = explain(pair);
      expect(e.highlight.eliminated).toEqual([{ cell: 0, digit: 5 }]);
    });

    it("uses distinctive reasoning in body for pair", () => {
      const e = explain(pair);
      expect(e.body).toContain("Those cells have to take them");
    });

    it("uses correct headline for triple", () => {
      const e = explain(triple);
      expect(e.headline).toBe("Hidden triple");
    });

    it("has correct units and digits for triple", () => {
      const e = explain(triple);
      expect(e.highlight.units).toEqual([{ kind: "row", index: 2 }]);
      expect(e.highlight.digits).toEqual([4, 7, 9]);
    });

    it("includes cells in highlight for triple", () => {
      const e = explain(triple);
      expect(e.highlight.cells).toContain(18);
      expect(e.highlight.cells).toContain(19);
      expect(e.highlight.cells).toContain(20);
    });

    it("carries removes to eliminated for triple", () => {
      const e = explain(triple);
      expect(e.highlight.eliminated).toEqual([
        { cell: 18, digit: 3 },
        { cell: 19, digit: 6 },
      ]);
    });

    it("uses distinctive reasoning in body for triple", () => {
      const e = explain(triple);
      expect(e.body).toContain("Those cells have to take them");
    });
  });

  describe("x-wing", () => {
    const d = SAMPLES[5];

    it("has lines then covers in units (in that order)", () => {
      const e = explain(d);
      expect(e.highlight.units).toEqual([
        { kind: "row", index: 0 },
        { kind: "row", index: 7 },
        { kind: "col", index: 0 },
        { kind: "col", index: 3 },
      ]);
    });

    it("has correct digit in highlight", () => {
      const e = explain(d);
      expect(e.highlight.digits).toEqual([4]);
    });

    it("includes all four corner cells in highlight", () => {
      const e = explain(d);
      expect(e.highlight.cells).toContain(0);
      expect(e.highlight.cells).toContain(3);
      expect(e.highlight.cells).toContain(63);
      expect(e.highlight.cells).toContain(66);
    });

    it("carries removes to eliminated", () => {
      const e = explain(d);
      expect(e.highlight.eliminated).toEqual([{ cell: 27, digit: 4 }]);
    });

    it("names both cover units in the closing clause", () => {
      const e = explain(d);
      expect(e.body).toContain("column 1");
      expect(e.body).toContain("column 4");
      expect(e.body).toContain("either of those");
    });
  });
});
