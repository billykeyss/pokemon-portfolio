import { describe, expect, it } from "vitest";
import { gradeGrid, hardestRank, tierOfRank } from "./grade";
import type { Cell, Grid } from "./types";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

const CLASSIC = parse(
  "53..7...." + "6..195..." + ".98....6." +
  "8...6...3" + "4..8.3..1" + "7...2...6" +
  ".6....28." + "...419..5" + "....8..79",
);

describe("tierOfRank", () => {
  it("maps ranks to tiers", () => {
    expect(tierOfRank(0)).toBe("easy");
    expect(tierOfRank(1)).toBe("easy");
    expect(tierOfRank(2)).toBe("medium");
    expect(tierOfRank(3)).toBe("hard");
    expect(tierOfRank(4)).toBe("expert");
  });

  it("treats naked and hidden singles as the same tier", () => {
    // Auto-candidates draw naked singles for the player, so on their own they
    // are not a difficulty at all — hidden singles are the floor.
    expect(tierOfRank(0)).toBe(tierOfRank(1));
  });
});

describe("hardestRank", () => {
  it("returns null for a grid the techniques cannot finish", () => {
    expect(hardestRank(parse(".".repeat(81)))).toBeNull();
  });

  it("returns 0 for a grid needing only naked singles", () => {
    const nearly = parse(
      "534678912" + "672195348" + "198342567" +
      "859761423" + "426853791" + "713924856" +
      "961537284" + "287419635" + "34528617.",
    );
    expect(hardestRank(nearly)).toBe(0);
  });

  it("grades the classic puzzle as solvable by the implemented techniques", () => {
    const rank = hardestRank(CLASSIC);
    expect(rank).not.toBeNull();
    expect(rank as number).toBeGreaterThanOrEqual(0);
    expect(rank as number).toBeLessThanOrEqual(4);
  });
});

describe("gradeGrid", () => {
  it("gives the classic puzzle a tier", () => {
    expect(["easy", "medium", "hard", "expert"]).toContain(gradeGrid(CLASSIC));
  });

  it("is null when the puzzle needs a technique we do not implement", () => {
    expect(gradeGrid(parse(".".repeat(81)))).toBeNull();
  });

  it("is deterministic", () => {
    expect(gradeGrid(CLASSIC)).toBe(gradeGrid(CLASSIC));
  });
});
