import { colOf, rowOf } from "./grid";
import type { Deduction, Elim } from "./techniques";
import type { Digit, Idx, Unit } from "./types";

export interface HintHighlight {
  /** Cells the argument rests on. */
  cells: Idx[];
  /** Units the argument is about. */
  units: Unit[];
  digits: Digit[];
  eliminated: Elim[];
}

export interface Explanation {
  headline: string;
  body: string;
  highlight: HintHighlight;
}

export const cellName = (i: Idx): string => `r${rowOf(i) + 1}c${colOf(i) + 1}`;

export function unitName(u: Unit): string {
  const label = u.kind === "row" ? "row" : u.kind === "col" ? "column" : "box";
  return `${label} ${u.index + 1}`;
}

const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/**
 * The wording lives here rather than in the hint component so it can be tested,
 * and so the sentence and the board highlight are produced from one value. A
 * hint that highlights cells its text does not mention is worse than no hint.
 */
export function explain(d: Deduction): Explanation {
  switch (d.kind) {
    case "naked-single":
      return {
        headline: "Naked single",
        body: `${cellName(d.cell)} has only one candidate left, so it must be ${d.digit}.`,
        highlight: { cells: [d.cell], units: [], digits: [d.digit], eliminated: [] },
      };

    case "hidden-single":
      return {
        headline: "Hidden single",
        body:
          `${d.digit} can only go in ${cellName(d.cell)} — every other empty cell in ` +
          `${unitName(d.unit)} already sees a ${d.digit} in its row, column or box.`,
        highlight: {
          cells: [d.cell, ...d.because],
          units: [d.unit],
          digits: [d.digit],
          eliminated: [],
        },
      };

    case "locked-candidates":
      return {
        headline: "Locked candidates",
        body:
          `Inside ${unitName(d.box)}, ${d.digit} can only sit in ${unitName(d.line)}. ` +
          `It has to go somewhere in that box, so no cell in ${unitName(d.line)} outside ` +
          `the box can be a ${d.digit}.`,
        highlight: {
          cells: d.cells,
          units: [d.box, d.line],
          digits: [d.digit],
          eliminated: d.removes,
        },
      };

    case "naked-subset":
      return {
        headline: d.cells.length === 2 ? "Naked pair" : "Naked triple",
        body:
          `${list(d.cells.map(cellName))} can only hold ${list(d.digits.map(String))}. ` +
          `Between them they use all ${d.digits.length} up, so nothing else in ` +
          `${unitName(d.unit)} can be one of those.`,
        highlight: {
          cells: d.cells,
          units: [d.unit],
          digits: d.digits,
          eliminated: d.removes,
        },
      };

    case "hidden-subset":
      return {
        headline: d.cells.length === 2 ? "Hidden pair" : "Hidden triple",
        body:
          `In ${unitName(d.unit)}, ${list(d.digits.map(String))} only fit in ` +
          `${list(d.cells.map(cellName))}. Those cells have to take them, so ` +
          `nothing else can live there.`,
        highlight: {
          cells: d.cells,
          units: [d.unit],
          digits: d.digits,
          eliminated: d.removes,
        },
      };

    case "x-wing":
      return {
        headline: "X-wing",
        body:
          `${d.digit} sits in exactly two places in both ${unitName(d.lines[0])} and ` +
          `${unitName(d.lines[1])}, and they line up on ${unitName(d.covers[0])} and ` +
          `${unitName(d.covers[1])}. Whichever pair of corners is right, both of those ` +
          `lines are spoken for — so no other cell in them can be a ${d.digit}.`,
        highlight: {
          cells: d.cells,
          units: [...d.lines, ...d.covers],
          digits: [d.digit],
          eliminated: d.removes,
        },
      };
  }
}
