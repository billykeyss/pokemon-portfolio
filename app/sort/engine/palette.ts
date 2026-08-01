export interface Potion {
  name: string;
  hex: string;
}

/**
 * Sixteen liquids, spread across hue *and* lightness.
 *
 * Order is the important part. A level uses the first N entries, so the list is
 * sequenced by how far apart the colours are rather than by hue: red, blue,
 * yellow, green, purple before the list starts filling in between them. Sorted
 * around the colour wheel instead, an early level would draw its five colours
 * from one narrow arc — orange beside amber beside gold — which is exactly the
 * comparison a player cannot make at a glance.
 *
 * Lightness carries its share too, now that nothing is printed on the liquid to
 * tell colours apart: a pale bone and a dark iron stay separable from the
 * saturated mid-tones even where hues crowd together at the wide end.
 */
export const PALETTE: readonly Potion[] = [
  { name: "ember", hex: "#E4463C" },
  { name: "cobalt", hex: "#3D7FE8" },
  { name: "gold", hex: "#F7C93E" },
  { name: "moss", hex: "#3FBF4F" },
  { name: "orchid", hex: "#9B4FD6" },
  { name: "amber", hex: "#F2833C" },
  { name: "aqua", hex: "#45CBE6" },
  { name: "blush", hex: "#F79CC0" },
  { name: "jade", hex: "#1F9E86" },
  { name: "fuchsia", hex: "#DB4FB4" },
  { name: "bone", hex: "#F0E6D2" },
  { name: "indigo", hex: "#5A4BD6" },
  { name: "lime", hex: "#C7E04A" },
  { name: "cocoa", hex: "#9C6239" },
  { name: "slate", hex: "#7E8CA0" },
  { name: "iron", hex: "#5A6472" },
];

export const MAX_COLORS = PALETTE.length;
export const CAPACITY = 4;
