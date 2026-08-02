import { describe, expect, it } from "vitest";
import {
  decodeBoard,
  defaultPicrossSave,
  encodeBoard,
  loadPicrossSave,
  migratePicrossSave,
  PICROSS_SAVE_KEY,
  writePicrossSave,
} from "./save";
import { BLANK, FILLED, UNKNOWN } from "./types";

const memory = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
};

describe("encodeBoard / decodeBoard", () => {
  it("round-trips a board", () => {
    const board = Uint8Array.from([UNKNOWN, FILLED, BLANK, FILLED]);
    expect(decodeBoard(encodeBoard(board), 2)).toEqual(board);
  });

  it("rejects a payload of the wrong length", () => {
    expect(decodeBoard("012", 2)).toBeNull();
  });

  it("rejects a payload with junk in it", () => {
    expect(decodeBoard("01x2", 2)).toBeNull();
  });
});

describe("migratePicrossSave", () => {
  it("falls back to a fresh save for junk", () => {
    expect(migratePicrossSave(null)).toEqual(defaultPicrossSave());
    expect(migratePicrossSave("nope")).toEqual(defaultPicrossSave());
    expect(migratePicrossSave([1, 2])).toEqual(defaultPicrossSave());
  });

  it("keeps best at least as high as the current level", () => {
    expect(migratePicrossSave({ level: 7, best: 2 }).best).toBe(7);
  });

  it("drops in-progress work that does not name its level", () => {
    expect(migratePicrossSave({ level: 3, progress: { cells: "011" } }).progress).toBeNull();
  });

  it("keeps well-formed in-progress work", () => {
    const save = migratePicrossSave({
      level: 3,
      progress: { level: 3, cells: "0121" },
    });
    expect(save.progress).toEqual({ level: 3, cells: "0121" });
  });
});

describe("loadPicrossSave / writePicrossSave", () => {
  it("round-trips through storage", () => {
    const storage = memory();
    const save = { ...defaultPicrossSave(), level: 4, best: 6 };
    writePicrossSave(storage, save);
    expect(loadPicrossSave(storage)).toEqual(save);
  });

  it("starts fresh when nothing is stored", () => {
    expect(loadPicrossSave(memory())).toEqual(defaultPicrossSave());
  });

  it("survives a corrupt payload", () => {
    const storage = memory();
    storage.setItem(PICROSS_SAVE_KEY, "{{{");
    expect(loadPicrossSave(storage)).toEqual(defaultPicrossSave());
  });
});
