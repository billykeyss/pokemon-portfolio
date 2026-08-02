// app/sudoku/engine/grid.test.ts
import { describe, expect, it } from "vitest";
import { BOXES, CELLS, COLS, PEERS, ROWS, UNITS, boxOf, cellsOf, colOf, rowOf, unitsOf } from "./grid";

describe("coordinates", () => {
  it("maps the corners", () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect([rowOf(30), colOf(30), boxOf(30)]).toEqual([3, 3, 4]);
  });

  it("gives every cell a box matching its row and column band", () => {
    for (let i = 0; i < CELLS; i++) {
      expect(boxOf(i)).toBe(Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3));
    }
  });
});

describe("units", () => {
  it("has 27 units of nine distinct cells", () => {
    expect(UNITS).toHaveLength(27);
    for (const unit of UNITS) {
      const cells = cellsOf(unit);
      expect(cells).toHaveLength(9);
      expect(new Set(cells).size).toBe(9);
    }
  });

  it("covers every cell exactly once per kind", () => {
    for (const group of [ROWS, COLS, BOXES]) {
      expect(new Set(group.flat()).size).toBe(CELLS);
    }
  });

  it("puts each cell in exactly three units", () => {
    for (let i = 0; i < CELLS; i++) {
      const units = unitsOf(i);
      expect(units).toHaveLength(3);
      expect(units.map((u) => u.kind).sort()).toEqual(["box", "col", "row"]);
      for (const unit of units) expect(cellsOf(unit)).toContain(i);
    }
  });
});

describe("PEERS", () => {
  it("gives every cell exactly 20 peers", () => {
    for (let i = 0; i < CELLS; i++) expect(PEERS[i]).toHaveLength(20);
  });

  it("never includes the cell itself", () => {
    for (let i = 0; i < CELLS; i++) expect(PEERS[i]).not.toContain(i);
  });

  it("is symmetric — peerhood is a mutual constraint", () => {
    for (let i = 0; i < CELLS; i++) {
      for (const p of PEERS[i]) expect(PEERS[p]).toContain(i);
    }
  });

  it("is exactly the cells sharing a row, column or box", () => {
    for (let i = 0; i < CELLS; i++) {
      const expected = new Set<number>();
      for (let j = 0; j < CELLS; j++) {
        if (j === i) continue;
        if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) {
          expected.add(j);
        }
      }
      expect(new Set(PEERS[i])).toEqual(expected);
    }
  });
});
