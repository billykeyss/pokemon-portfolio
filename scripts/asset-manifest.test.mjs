import { describe, expect, it } from "vitest";
import { collectAssets, manifestText, readManifest } from "./asset-manifest.mjs";

describe("asset manifest", () => {
  it("matches what is actually on disk", () => {
    // The whole reason the manifest is generated rather than hand-written. A
    // sprite added without re-running the script would otherwise ship a list
    // that silently omits it, and the omission would only surface as a game
    // that cannot draw itself on a train.
    expect(readManifest()).toBe(manifestText());
  });

  it("covers the sprites the three games fetch at play time", () => {
    const assets = collectAssets();
    // Traffic and Shelf request these by name from engine/render code; the
    // paths are built by string interpolation there, so nothing else in the
    // suite would notice if the directories moved.
    expect(assets.some((a) => a.startsWith("/game/traffic/"))).toBe(true);
    expect(assets.some((a) => a.startsWith("/game/shelf/"))).toBe(true);
    expect(assets.some((a) => a.startsWith("/bounce/sprites/"))).toBe(true);
  });

  it("lists real URLs, rooted and slash-separated", () => {
    for (const a of collectAssets()) {
      expect(a.startsWith("/")).toBe(true);
      expect(a).not.toContain("\\");
      expect(a).not.toContain("//");
    }
  });

  it("is sorted, so the file does not churn between machines", () => {
    const assets = collectAssets();
    expect(assets).toEqual([...assets].sort());
  });

  it("excludes the resume imagery, which no game needs to play", () => {
    // /public/projects is ~2MB of screenshots. Precaching it would triple the
    // install for nothing a player can interact with.
    expect(collectAssets().some((a) => a.startsWith("/projects/"))).toBe(false);
  });
});
