import { parseHex } from "./extract";

export const MAX_SHARED = 10;

/**
 * A palette as a URL query value: `c=1a2b3c-ffeedd-...`.
 *
 * The site is a static export with no server to store anything, so the link
 * itself has to carry the palette. Six hex digits per colour, no `#` — a `#`
 * in a query value needs escaping and would make the link ugly to paste.
 */
export const encodeColors = (hexes: readonly string[]): string =>
  hexes.map((h) => h.replace(/^#/, "").toLowerCase()).join("-");

/** The colours in a shared link, or an empty list for anything malformed. */
export function decodeColors(value: string | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const part of value.split("-").slice(0, MAX_SHARED)) {
    if (!parseHex(part)) return [];
    out.push(`#${part.toLowerCase()}`);
  }
  return out;
}

export function shareUrl(origin: string, hexes: readonly string[]): string {
  return `${origin}/palette/?c=${encodeColors(hexes)}`;
}
