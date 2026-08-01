export interface Potion {
  name: string;
  hex: string;
  /** Single character drawn on each unit so colour is never the only cue. */
  glyph: string;
}

/**
 * Pokemon type colours. At twelve, several read similarly, and colour alone is
 * not a usable distinction for a colourblind player — hence the glyphs.
 */
export const PALETTE: readonly Potion[] = [
  { name: "fire", hex: "#F08030", glyph: "F" },
  { name: "water", hex: "#6890F0", glyph: "W" },
  { name: "grass", hex: "#78C850", glyph: "G" },
  { name: "electric", hex: "#F8D030", glyph: "E" },
  { name: "psychic", hex: "#F85888", glyph: "P" },
  { name: "poison", hex: "#A040A0", glyph: "K" },
  { name: "ice", hex: "#98D8D8", glyph: "I" },
  { name: "dragon", hex: "#7038F8", glyph: "D" },
  { name: "fighting", hex: "#C03028", glyph: "H" },
  { name: "ground", hex: "#E0C068", glyph: "R" },
  { name: "ghost", hex: "#705898", glyph: "S" },
  { name: "steel", hex: "#B8B8D0", glyph: "M" },
];

export const MAX_COLORS = PALETTE.length;
export const CAPACITY = 4;
