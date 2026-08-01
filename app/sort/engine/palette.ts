export interface Potion {
  name: string;
  hex: string;
}

/**
 * Sixteen pastel liquids.
 *
 * Order is the important part. A level uses the first N entries, so the list is
 * sequenced by how far apart the colours are rather than by hue: rose, blue,
 * yellow, green, purple before it starts filling in between them. Sorted around
 * the colour wheel instead, an early level would draw its five colours from one
 * narrow arc — peach beside butter beside clay — which is exactly the
 * comparison a player cannot make at a glance.
 *
 * Pastels are the harder case for that, because washing colour out costs
 * saturation, which is one of the two things that separate them. So lightness
 * does more work here than it did with the saturated set: cream sits near
 * white, slate and denim sit deliberately darker, and the greens are split
 * across mint, teal and sage rather than being three versions of one tint.
 */
export const PALETTE: readonly Potion[] = [
  { name: "rose", hex: "#F08A8A" },
  { name: "periwinkle", hex: "#8FA8F0" },
  { name: "butter", hex: "#F3DC8C" },
  { name: "mint", hex: "#86D6A2" },
  { name: "lilac", hex: "#C3A0EB" },
  { name: "peach", hex: "#F0A96B" },
  { name: "sky", hex: "#92D6EA" },
  { name: "bubblegum", hex: "#EFA2CE" },
  { name: "teal", hex: "#6FBBAE" },
  { name: "cream", hex: "#F2E7D2" },
  { name: "sage", hex: "#B3C892" },
  { name: "denim", hex: "#6E86BA" },
  { name: "clay", hex: "#C79A7E" },
  { name: "fog", hex: "#B9C2CE" },
  { name: "plum", hex: "#A177A8" },
  { name: "slate", hex: "#7C8697" },
];

export const MAX_COLORS = PALETTE.length;
export const CAPACITY = 4;
