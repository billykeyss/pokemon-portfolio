#!/usr/bin/env node
// Lists the assets games fetch at play time, for the service worker to
// precache.
//
// These cannot be precached by name in sw.js the way routes are: there are
// eighty of them and they change whenever someone draws a new sprite, so a
// hardcoded list would rot silently and the failure would be invisible until a
// player opened a game on a train. Generating it keeps the list honest, and
// scripts/asset-manifest.test.mjs fails the suite if the committed copy has
// drifted from what is on disk.
//
// Only directories games actually fetch from are walked. /public/projects is
// resume imagery — two megabytes nobody needs offline to play anything.

import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public", "asset-manifest.json");

/** Directories under public/ whose contents a game requests at runtime. */
export const ASSET_DIRS = ["game", "bounce"];

function walk(dir, prefix, found) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const url = posix.join(prefix, entry);
    if (statSync(full).isDirectory()) walk(full, url, found);
    else found.push(url);
  }
  return found;
}

/** Every runtime asset URL, sorted so the output is stable across machines. */
export function collectAssets(root = ROOT) {
  const found = [];
  for (const dir of ASSET_DIRS) {
    walk(join(root, "public", dir), `/${dir}`, found);
  }
  return found.sort();
}

export function manifestText(root = ROOT) {
  return `${JSON.stringify({ assets: collectAssets(root) }, null, 2)}\n`;
}

export function readManifest(root = ROOT) {
  return readFileSync(join(root, "public", "asset-manifest.json"), "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = manifestText();
  writeFileSync(OUT, text);
  const count = JSON.parse(text).assets.length;
  console.log(`asset-manifest.json: ${count} runtime assets`);
}
