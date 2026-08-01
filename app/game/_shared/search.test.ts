import { describe, expect, it } from "vitest";
import { firstMove, search, type SearchSpec } from "./search";

/**
 * Jug puzzle: two jugs, capacities 5 and 3, reach exactly 4 in the first.
 * Small enough to reason about by hand, rich enough to have dead ends.
 */
type Jugs = [number, number];
type JugMove = "fillA" | "fillB" | "emptyA" | "emptyB" | "aToB" | "bToA";

const CAP: Jugs = [5, 3];

const jugs: SearchSpec<Jugs, JugMove> = {
  key: ([a, b]) => `${a},${b}`,
  solved: ([a]) => a === 4,
  moves: () => ["fillA", "fillB", "emptyA", "emptyB", "aToB", "bToA"],
  apply: ([a, b], move) => {
    switch (move) {
      case "fillA":
        return [CAP[0], b];
      case "fillB":
        return [a, CAP[1]];
      case "emptyA":
        return [0, b];
      case "emptyB":
        return [a, 0];
      case "aToB": {
        const pour = Math.min(a, CAP[1] - b);
        return [a - pour, b + pour];
      }
      default: {
        const pour = Math.min(b, CAP[0] - a);
        return [a + pour, b - pour];
      }
    }
  },
};

/** A one-dimensional walk that can only ever reach even positions. */
const evensOnly: SearchSpec<number, number> = {
  key: (n) => String(n),
  solved: (n) => n === 7,
  moves: (n) => (Math.abs(n) > 20 ? [] : [2, -2]),
  apply: (n, step) => n + step,
};

describe("search", () => {
  it("returns no moves when the start is already solved", () => {
    const result = search<Jugs, JugMove>([4, 0], jugs);
    expect(result.status).toBe("solved");
    if (result.status === "solved") expect(result.moves).toHaveLength(0);
  });

  it("finds a solution depth-first", () => {
    expect(search<Jugs, JugMove>([0, 0], jugs).status).toBe("solved");
  });

  it("replays its own solution to a solved state", () => {
    const result = search<Jugs, JugMove>([0, 0], jugs);
    expect(result.status).toBe("solved");
    if (result.status !== "solved") return;

    let state: Jugs = [0, 0];
    for (const move of result.moves) state = jugs.apply(state, move);
    expect(jugs.solved(state)).toBe(true);
  });

  it("reports unsolvable when the goal is unreachable", () => {
    expect(search(0, evensOnly).status).toBe("unsolvable");
  });

  it("returns unknown rather than lying when the node cap is hit", () => {
    expect(search(0, evensOnly, { nodeCap: 3 }).status).toBe("unknown");
  });

  it("handles a spec that offers no moves at all", () => {
    const stuck: SearchSpec<number, number> = {
      key: String,
      solved: (n) => n === 99,
      moves: () => [],
      apply: (n) => n,
    };
    expect(search(0, stuck).status).toBe("unsolvable");
  });
});

describe("search (breadth-first)", () => {
  it("finds the shortest solution", () => {
    // 5,3 jugs to 4 takes six moves at best; depth-first will wander further.
    const bfs = search<Jugs, JugMove>([0, 0], jugs, { strategy: "bfs" });
    expect(bfs.status).toBe("solved");
    if (bfs.status !== "solved") return;

    expect(bfs.moves).toHaveLength(6);
  });

  it("never returns a longer path than depth-first", () => {
    const bfs = search<Jugs, JugMove>([0, 0], jugs, { strategy: "bfs" });
    const dfs = search<Jugs, JugMove>([0, 0], jugs, { strategy: "dfs" });
    if (bfs.status !== "solved" || dfs.status !== "solved") throw new Error("unsolved");
    expect(bfs.moves.length).toBeLessThanOrEqual(dfs.moves.length);
  });

  it("still reports unsolvable correctly", () => {
    expect(search(0, evensOnly, { strategy: "bfs" }).status).toBe("unsolvable");
  });
});

describe("depth bound", () => {
  it("finds a solution that sits inside the bound", () => {
    const result = search<Jugs, JugMove>([0, 0], jugs, {
      strategy: "bfs",
      maxDepth: 6,
    });
    expect(result.status).toBe("solved");
  });

  it("reports depthCap when the solution is deeper than the bound", () => {
    // The shortest solution is six moves, so five is provably not enough.
    const result = search<Jugs, JugMove>([0, 0], jugs, {
      strategy: "bfs",
      maxDepth: 5,
    });
    expect(result).toEqual({ status: "unknown", reason: "depthCap" });
  });

  it("still proves unsolvable when the frontier drains inside the bound", () => {
    // Nothing was pruned, so exhausting the space is a real proof, not a
    // truncation — this is the distinction depthCap exists to preserve.
    const result = search(0, evensOnly, { strategy: "bfs", maxDepth: 500 });
    expect(result.status).toBe("unsolvable");
  });

  it("labels a node-cap give-up differently from a depth-cap one", () => {
    const result = search(0, evensOnly, { nodeCap: 3 });
    expect(result).toEqual({ status: "unknown", reason: "nodeCap" });
  });

  it("treats a zero bound as proving nothing beyond the start", () => {
    const result = search<Jugs, JugMove>([0, 0], jugs, {
      strategy: "bfs",
      maxDepth: 0,
    });
    expect(result).toEqual({ status: "unknown", reason: "depthCap" });
  });
});

describe("score ordering", () => {
  /**
   * Records the order states are *expanded* in. That is the thing score
   * ordering controls — `apply` runs for every child during expansion, so its
   * call order says nothing about which branch the search actually follows.
   */
  function fanOut(score: (move: number) => number) {
    const expanded: number[] = [];
    const spec: SearchSpec<number, number> = {
      key: String,
      solved: (n) => n === 99,
      moves: (n) => {
        expanded.push(n);
        return n === 0 ? [1, 2, 3] : [];
      },
      apply: (_state, move) => move,
      score: (_state, move) => score(move),
    };

    search(0, spec, { strategy: "dfs" });
    return expanded;
  }

  it("explores the highest-scoring branch first", () => {
    expect(fanOut((m) => m).slice(0, 2)).toEqual([0, 3]);
  });

  it("follows the score, not the move order", () => {
    // Same moves, inverted preference: the search must now descend into 1.
    expect(fanOut((m) => -m).slice(0, 2)).toEqual([0, 1]);
  });
});

describe("firstMove", () => {
  it("returns the opening move of a solution", () => {
    expect(firstMove<Jugs, JugMove>([0, 0], jugs, { strategy: "bfs" })).not.toBeNull();
  });

  it("returns null when already solved", () => {
    expect(firstMove<Jugs, JugMove>([4, 0], jugs)).toBeNull();
  });

  it("returns null when unsolvable", () => {
    expect(firstMove(0, evensOnly)).toBeNull();
  });
});
