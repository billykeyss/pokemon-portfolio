import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  SUDOKU_SAVE_KEY,
  decodeGrid,
  defaultSudokuSave,
  encodeGrid,
  loadSudokuSave,
  migrateSudokuSave,
  recordSolve,
  writeSudokuSave,
} from "./save";
import { TIERS, type Cell } from "./types";

const memory = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
};

describe("grid coding", () => {
  it("round-trips a grid", () => {
    const grid = Array.from({ length: 81 }, (_, i) => ((i % 10) as Cell));
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  it("returns an empty grid for junk", () => {
    expect(decodeGrid("nonsense")).toHaveLength(81);
    expect(decodeGrid("nonsense").every((c) => c === 0)).toBe(true);
  });
});

describe("migrateSudokuSave", () => {
  it("returns a default save for junk", () => {
    expect(migrateSudokuSave(null)).toEqual(defaultSudokuSave());
    expect(migrateSudokuSave("nope")).toEqual(defaultSudokuSave());
    expect(migrateSudokuSave([1, 2, 3])).toEqual(defaultSudokuSave());
  });

  it("keeps a stats entry for every tier no matter what was stored", () => {
    const save = migrateSudokuSave({ stats: { easy: { solved: 4, bestMs: 1000 } } });
    for (const tier of TIERS) expect(save.stats[tier]).toBeDefined();
    expect(save.stats.easy.solved).toBe(4);
    expect(save.stats.hard.solved).toBe(0);
  });

  it("rejects a nonsense tier", () => {
    expect(migrateSudokuSave({ tier: "impossible" }).tier).toBe("easy");
  });

  it("drops negative or non-finite stats", () => {
    const save = migrateSudokuSave({ stats: { easy: { solved: -3, bestMs: NaN } } });
    expect(save.stats.easy.solved).toBe(0);
    expect(save.stats.easy.bestMs).toBeNull();
  });

  it("drops an in-progress board whose grids are the wrong shape", () => {
    expect(migrateSudokuSave({ inProgress: { givens: "12", tier: "easy" } }).inProgress).toBeNull();
    expect(migrateSudokuSave({ inProgress: { givens: "1".repeat(81), solution: "12", tier: "easy" } }).inProgress).toBeNull();
    expect(migrateSudokuSave({ inProgress: { givens: "1".repeat(81), solution: "2".repeat(81), tier: "easy", entries: "12" } }).inProgress).toBeNull();
  });

  it("accepts and maps all fields of a well-formed in-progress board", () => {
    const givens = "1".repeat(81);
    const solution = "2".repeat(81);
    const entries = "3".repeat(81);
    const save = migrateSudokuSave({
      inProgress: {
        tier: "hard",
        seed: 12345,
        givens,
        solution,
        entries,
        elapsedMs: 45000,
        mistakes: 3,
      },
    });
    expect(save.inProgress).not.toBeNull();
    expect(save.inProgress!.tier).toBe("hard");
    expect(save.inProgress!.seed).toBe(12345);
    expect(save.inProgress!.givens).toBe(givens);
    expect(save.inProgress!.solution).toBe(solution);
    expect(save.inProgress!.entries).toBe(entries);
    expect(save.inProgress!.elapsedMs).toBe(45000);
    expect(save.inProgress!.mistakes).toBe(3);
  });
});

describe("recordSolve", () => {
  it("counts the solve against the tier it was played at, and no other", () => {
    const after = recordSolve(defaultSudokuSave(), "hard", 90_000);
    expect(after.stats.hard.solved).toBe(1);
    for (const tier of TIERS) {
      if (tier !== "hard") expect(after.stats[tier].solved).toBe(0);
    }
  });

  it("takes the first time as the best, then only improvements", () => {
    const first = recordSolve(defaultSudokuSave(), "easy", 90_000);
    expect(first.stats.easy.bestMs).toBe(90_000);

    const faster = recordSolve(first, "easy", 60_000);
    expect(faster.stats.easy.bestMs).toBe(60_000);
    expect(faster.stats.easy.solved).toBe(2);

    const slower = recordSolve(faster, "easy", 120_000);
    expect(slower.stats.easy.bestMs).toBe(60_000);
    expect(slower.stats.easy.solved).toBe(3);
  });

  it("leaves the save it was handed untouched", () => {
    const before = defaultSudokuSave();
    recordSolve(before, "expert", 1000);
    expect(before.stats.expert).toEqual({ solved: 0, bestMs: null });
  });
});

describe("load / write", () => {
  it("writes under the key the arcade dashboard reads", () => {
    // registry.ts repeats this literal so the dashboard need not import from a
    // game. Two literals with nothing binding them means a rename here would
    // silently blank the Sudoku cabinet's progress line; this is the binding.
    expect(SUDOKU_SAVE_KEY).toBe("game:sudoku");
    const store = memory();
    writeSudokuSave(store, defaultSudokuSave());
    expect(store.data["game:sudoku"]).toBeDefined();
  });

  it("starts fresh when nothing is stored", () => {
    expect(loadSudokuSave(memory())).toEqual(defaultSudokuSave());
  });

  it("round-trips through storage", () => {
    const store = memory();
    const save = { ...defaultSudokuSave(), tier: "hard" as const };
    writeSudokuSave(store, save);
    expect(loadSudokuSave(store).tier).toBe("hard");
  });

  it("survives storage that throws", () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => writeSudokuSave(hostile, defaultSudokuSave())).not.toThrow();
    expect(loadSudokuSave(hostile)).toEqual(defaultSudokuSave());
  });
});
