import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `page.tsx` has no engine-level equivalent — it is the only place that
 * decides *which* `Carry` a room begins with, and that decision cannot be
 * exercised by a headless engine test the way `beginRoom`/`settleClear`
 * themselves can (see `engine/run.test.ts` and `engine/ladder.test.ts`,
 * which both call the real functions rather than reimplementing them).
 * There is no DOM test harness in this repo to render the page and click
 * "Try again", so this file checks the one thing about that decision that
 * *is* mechanically checkable: the source text of the `retry` callback.
 *
 * This exists for the same reason `data/upgrades.test.ts`'s CONSUMERS guard
 * greps source instead of executing it — some invariants about *which code
 * path runs* are cheaper and more reliable to pin textually than to stand up
 * a rendering harness for.
 */
const PAGE_SRC = readFileSync(join(__dirname, "page.tsx"), "utf8");

/** The exact body of the `retry` callback, isolated from the rest of the page. */
function retryBody(): string {
  const match = PAGE_SRC.match(/const retry = useCallback\(\(\) => \{([\s\S]*?)\}, \[level\]\);/);
  if (!match) throw new Error("could not locate the `retry` callback in page.tsx");
  return match[1];
}

describe("page.tsx retry wiring", () => {
  // Regression coverage for the review's mutation 4: `page.tsx:179` carrying
  // the run forward on death instead of calling `freshCarry()` — silently
  // contradicting the spec's "death wipes them" and letting a fallen run
  // keep its mods and purse.
  it("resets the run with freshCarry, not whatever the world carried into the fall", () => {
    const body = retryBody();
    expect(body).toContain("freshCarry()");
    expect(body).not.toContain("carryForward(");
  });

  it("rebuilds the room through beginRoom, the same function every other transition uses", () => {
    expect(retryBody()).toMatch(/beginRoom\(\s*level\s*,\s*freshCarry\(\)\s*\)/);
  });
});
