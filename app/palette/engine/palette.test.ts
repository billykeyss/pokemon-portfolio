import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import { extractPalette, parseHex, toHex } from "./extract";
import {
  MAX_SAVED,
  PALETTE_HISTORY_KEY,
  addPalette,
  emptyHistory,
  findSaved,
  loadHistory,
  removePalette,
  writeHistory,
} from "./history";
import { decodeColors, encodeColors, shareUrl } from "./share";

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

/** An RGBA buffer of `n` pixels of each colour given. */
function pixels(blocks: [string, number, number?][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [hex, n, alpha = 255] of blocks) {
    const [r, g, b] = parseHex(hex)!;
    for (let i = 0; i < n; i++) out.push(r, g, b, alpha);
  }
  return new Uint8ClampedArray(out);
}

describe("extractPalette", () => {
  it("finds each flat colour, most common first", () => {
    const result = extractPalette(
      pixels([
        ["#ff0000", 50],
        ["#00ff00", 30],
        ["#0000ff", 20],
      ]),
      3,
    );
    expect(result.map((s) => s.hex)).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    expect(result.map((s) => s.weight)).toEqual([0.5, 0.3, 0.2]);
  });

  it("returns fewer colours than asked when the image has fewer", () => {
    const result = extractPalette(pixels([["#123456", 40], ["#abcdef", 10]]), 5);
    expect(result.map((s) => s.hex)).toEqual(["#123456", "#abcdef"]);
  });

  it("ignores transparent pixels", () => {
    const result = extractPalette(pixels([["#000000", 90, 0], ["#336699", 10]]), 3);
    expect(result).toEqual([{ hex: "#336699", weight: 1 }]);
  });

  it("is empty for an empty or fully transparent image", () => {
    expect(extractPalette(new Uint8ClampedArray(0))).toEqual([]);
    expect(extractPalette(pixels([["#ffffff", 5, 0]]))).toEqual([]);
  });

  it("points each colour at a pixel of that colour", () => {
    // A 4x2 image: left half red, right half blue.
    const data = pixels([
      ["#ff0000", 2],
      ["#0000ff", 2],
      ["#ff0000", 2],
      ["#0000ff", 2],
    ]);
    const result = extractPalette(data, 2, 1, 4);
    const red = result.find((s) => s.hex === "#ff0000")!;
    const blue = result.find((s) => s.hex === "#0000ff")!;
    expect(red.at!.x).toBeLessThan(0.5);
    expect(blue.at!.x).toBeGreaterThan(0.5);
    expect(extractPalette(data, 2)[0].at).toBeUndefined();
  });

  it("gives the same palette for the same pixels every time", () => {
    const data = new Uint8ClampedArray(4 * 500);
    for (let i = 0; i < data.length; i++) data[i] = (i * 37) % 256;
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    expect(extractPalette(data)).toEqual(extractPalette(data));
  });
});

describe("hex helpers", () => {
  it("round-trips", () => {
    expect(toHex(parseHex("#A1b2C3")!)).toBe("#a1b2c3");
    expect(parseHex("nope")).toBeNull();
    expect(parseHex("#fff")).toBeNull();
  });
});

describe("share links", () => {
  it("round-trips a palette through the query value", () => {
    const colors = ["#ff0000", "#00aa11"];
    expect(encodeColors(colors)).toBe("ff0000-00aa11");
    expect(decodeColors(encodeColors(colors))).toEqual(colors);
  });

  it("rejects a malformed link outright rather than showing half of it", () => {
    expect(decodeColors("ff0000-zzzzzz")).toEqual([]);
    expect(decodeColors("")).toEqual([]);
    expect(decodeColors(null)).toEqual([]);
  });

  it("builds a link to the palette route", () => {
    expect(shareUrl("https://x.dev", ["#abcdef"])).toBe("https://x.dev/palette/?c=abcdef");
  });
});

describe("saved palettes", () => {
  const entry = (id: string, colors: string[]) => ({ id, colors, createdAt: 1 });

  it("adds newest first and moves a re-saved palette to the top", () => {
    let h = emptyHistory();
    h = addPalette(h, entry("a", ["#111111"]));
    h = addPalette(h, entry("b", ["#222222"]));
    h = addPalette(h, entry("c", ["#111111"]));
    expect(h.items.map((p) => p.id)).toEqual(["c", "b"]);
    expect(findSaved(h, ["#111111"])?.id).toBe("c");
  });

  it("caps the list", () => {
    let h = emptyHistory();
    for (let i = 0; i < MAX_SAVED + 5; i++) h = addPalette(h, entry(`${i}`, [toHex([i, 0, 0])]));
    expect(h.items).toHaveLength(MAX_SAVED);
  });

  it("removes by id", () => {
    const h = addPalette(emptyHistory(), entry("a", ["#111111"]));
    expect(removePalette(h, "a").items).toEqual([]);
  });

  it("persists, and drops corrupt entries on load", () => {
    const storage = memory();
    writeHistory(storage, addPalette(emptyHistory(), entry("a", ["#111111"])));
    expect(loadHistory(storage).items.map((p) => p.id)).toEqual(["a"]);

    storage.data[PALETTE_HISTORY_KEY] = JSON.stringify({
      items: [entry("ok", ["#222222"]), { id: "bad", colors: ["red"], createdAt: 1 }, null],
    });
    expect(loadHistory(storage).items.map((p) => p.id)).toEqual(["ok"]);

    storage.data[PALETTE_HISTORY_KEY] = "{not json";
    expect(loadHistory(storage)).toEqual(emptyHistory());
  });
});
