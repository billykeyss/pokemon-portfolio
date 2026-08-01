#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentBounds, downscale, keyBackdrop } from "./chroma.mjs";
import { decodePng, encodePng } from "./png.mjs";

/**
 * Turn generated art into game sprites.
 *
 *   assets/sprites/raw/<game>/<name>.webp  ->  public/game/<game>/<name>.png
 *
 * Sources are committed alongside the output so this is reproducible: rerun it
 * and you get the same sprites, no image generator in the loop. Adding art is
 * dropping a file in the raw folder and running `pnpm sprites`.
 */

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RAW_DIR = join(ROOT, "assets/sprites/raw");
const OUT_DIR = join(ROOT, "public/game");
/** Longest edge of an emitted sprite. Cars draw ~120px at 2x DPR. */
const TARGET_LONG_EDGE = 256;

/** sips ships with macOS and reads webp; everything downstream wants PNG. */
function toPng(source) {
  if (extname(source).toLowerCase() === ".png") return readFileSync(source);

  const temp = join(ROOT, ".sprite-tmp.png");
  try {
    execFileSync("sips", ["-s", "format", "png", source, "--out", temp], {
      stdio: "pipe",
    });
    return readFileSync(temp);
  } finally {
    rmSync(temp, { force: true });
  }
}

function buildOne(source) {
  const png = decodePng(toPng(source));
  const { width, height, data } = png;

  const cleared = keyBackdrop(data, width, height);
  const box = contentBounds(data, width, height);
  if (box === null) throw new Error(`${basename(source)}: nothing survived keying`);

  const small = downscale(data, width, height, box, TARGET_LONG_EDGE);
  return {
    png: encodePng(small.width, small.height, small.data),
    stats: {
      from: `${width}x${height}`,
      to: `${small.width}x${small.height}`,
      keyedPct: Math.round((cleared / (width * height)) * 100),
    },
  };
}

function main() {
  let games;
  try {
    games = readdirSync(RAW_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    console.error(`No raw sprites at ${RAW_DIR}`);
    process.exit(1);
  }

  let built = 0;
  for (const game of games) {
    const inDir = join(RAW_DIR, game);
    const outDir = join(OUT_DIR, game);
    mkdirSync(outDir, { recursive: true });

    for (const file of readdirSync(inDir).sort()) {
      if (!/\.(webp|png)$/i.test(file)) continue;

      const name = basename(file, extname(file));
      const { png, stats } = buildOne(join(inDir, file));
      writeFileSync(join(outDir, `${name}.png`), png);

      console.log(
        `${game}/${name}: ${stats.from} -> ${stats.to}, ` +
          `${stats.keyedPct}% keyed, ${(png.length / 1024).toFixed(1)}kB`,
      );
      built++;
    }
  }

  console.log(`\n${built} sprite(s) written to public/game/`);
}

main();
