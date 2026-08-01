#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng } from "./png.mjs";

/**
 * Cut a sprite sheet into individual PNGs.
 *
 *   assets/sprites/food/Food.png  ->  public/game/shelf/food-NN.png
 *
 * Separate from `build.mjs` on purpose: that pipeline exists to key a flat
 * backdrop out of generated art, and this sheet already ships a real alpha
 * channel. Running it through the chroma key would be a no-op at best and would
 * eat pixels that happen to sit near the backdrop colour at worst.
 */

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SHEET = join(ROOT, "assets/sprites/food/Food.png");
const OUT_DIR = join(ROOT, "public/game/shelf");
const TILE = 16;

/** Is every pixel in this cell transparent? Empty cells are not sprites. */
function isBlank(data, width, ox, oy) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (data[((oy + y) * width + (ox + x)) * 4 + 3] > 0) return false;
    }
  }
  return true;
}

function main() {
  const sheet = decodePng(readFileSync(SHEET));
  const cols = Math.floor(sheet.width / TILE);
  const rows = Math.floor(sheet.height / TILE);

  mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let blank = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = col * TILE;
      const oy = row * TILE;

      if (isBlank(sheet.data, sheet.width, ox, oy)) {
        blank++;
        continue;
      }

      const tile = Buffer.alloc(TILE * TILE * 4);
      for (let y = 0; y < TILE; y++) {
        const from = ((oy + y) * sheet.width + ox) * 4;
        sheet.data.copy(tile, y * TILE * 4, from, from + TILE * 4);
      }

      // Index by sheet position, so a name always points at the same drawing
      // even if the sheet gains rows later.
      const index = row * cols + col;
      const name = `food-${String(index).padStart(2, "0")}.png`;
      writeFileSync(join(OUT_DIR, name), encodePng(TILE, TILE, tile));
      written++;
    }
  }

  console.log(
    `${sheet.width}x${sheet.height} sheet -> ${written} sprites ` +
      `(${blank} blank cells skipped) in public/game/shelf/`,
  );
}

main();
