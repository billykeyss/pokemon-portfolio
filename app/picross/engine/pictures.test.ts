import { describe, expect, it } from "vitest";
import { puzzleFrom } from "./clues";
import { PICTURES } from "./pictures";
import { isLineSolvable } from "./solve";
import { FILL_CHAR } from "./types";

describe("PICTURES", () => {
  it("has unique ids", () => {
    const ids = PICTURES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is square and non-empty", () => {
    for (const picture of PICTURES) {
      expect(picture.grid.length).toBeGreaterThan(0);
      for (const row of picture.grid) {
        expect(row.length).toBe(picture.grid.length);
      }
    }
  });

  it("draws something in every picture", () => {
    // A blank picture is a valid nonogram and a terrible one.
    for (const picture of PICTURES) {
      const filled = picture.grid.join("").split(FILL_CHAR).length - 1;
      expect(filled).toBeGreaterThan(0);
    }
  });

  it("names every picture and gives it a hex colour", () => {
    for (const picture of PICTURES) {
      expect(picture.name.length).toBeGreaterThan(0);
      expect(picture.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("ships only puzzles solvable without guessing", () => {
    // The build gate. A picture that needs a coin flip fails here rather than
    // stalling a player eight minutes into a 15x15.
    for (const picture of PICTURES) {
      expect(
        isLineSolvable(puzzleFrom(picture)),
        `${picture.id} needs guessing`,
      ).toBe(true);
    }
  });
});
