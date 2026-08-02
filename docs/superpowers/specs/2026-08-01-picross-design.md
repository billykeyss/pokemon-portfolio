# PICROSS — Design Spec

**Date:** 2026-08-01
**Status:** Approved, ready for implementation planning
**Route:** `/picross`

## Overview

PICROSS is a nonogram cabinet for the `/game` arcade: offline, frontend-only,
portrait mobile, one thumb. Numbered clues on each row and column give the
lengths of the filled runs in that line, in order, separated by at least one
blank. Shade the cells the clues imply and a picture resolves out of the grid.

It is the arcade's first **deduction** game. Every other cabinet — Potion Sort,
Traffic Jam, Shelf Sort, Arrow Escape — is a manipulation puzzle: move or remove
things in the right order to clear the board. Picross asks a different question.
You are not searching for a sequence of moves, you are reading what the clues
already force.

The payoff is the reveal. The solution *is* a pixel grid, which is what the
arcade's art already is, so finishing a puzzle uncovers a critter or an item in
the same hand-drawn style as the cabinet badges.

## Goals

- Playable one-handed in portrait, offline, on a phone.
- Every shipped puzzle solvable by pure logic, never by guessing.
- The reveal is the reward — artwork is a first-class requirement.
- Puzzles of roughly 1 minute (5×5) to 10 minutes (15×15).
- Unloseable: no timer, no lives, no fail state.

## Non-Goals

- No backend, no network at runtime, no accounts.
- No shared logic-puzzle engine (see "No shared core, deliberately").
- No colour nonograms — single-colour fills only.
- No landscape support.
- No procedurally generated pictures. A nonogram's whole payoff is
  recognising what it is; noise defeats the point.

## No shared core, deliberately

An earlier proposal was to build a reusable constraint-propagation core to back
Akari, Shikaku and Hashi as well. That was wrong and is explicitly rejected here.

Those puzzles share a *shape* — a grid, clues, a unique solution — but almost no
propagation logic. Nonogram propagates along whole lines by intersecting valid
run placements. Akari propagates light beams. Hashi propagates degree
constraints on nodes. Shikaku is rectangle packing. The only genuinely common
piece is the driver loop that iterates to a fixpoint, which is roughly forty
lines. Writing forty lines twice costs less than designing the wrong abstraction
once and wedging three games into it.

The precedent is `_shared/search.ts`: it became shared infrastructure *after* a
second game needed it, extracted from working code rather than imagined ahead of
it. If a second logic puzzle is ever built, the driver comes out then.

## Module layout

```
app/picross/
  engine/
    types.ts      CellState, Grid, Clue, Puzzle
    clues.ts      runsOf(line); cluesFrom(solution)
    line.ts       deduction core — one line, one clue, what is forced
    solve.ts      fixpoint driver over all rows and columns
    pictures.ts   the artwork, as string grids with a palette
    level.ts      size tiers and picture assignment per level
    save.ts       progress, including the in-progress board
  render/
    layout.ts     grid geometry including clue gutters
    draw.ts       canvas rendering and the reveal
  page.tsx
```

`_shared/search.ts` is not used. Nonogram deduction is constraint propagation,
not a state-space search, and forcing it through a search interface would
obscure both.

## The deduction core

`line.ts` is the whole game. Given one line's current state and its clue, it
enumerates every placement of the runs consistent with what is already known,
then intersects those placements:

- filled in **every** valid placement → forced filled
- blank in **every** valid placement → forced blank
- **zero** valid placements → contradiction

At 15 cells wide the worst case is a few thousand branches, which is nothing.
Enumeration is chosen over a cleverer dynamic program because it is obviously
correct and can be tested exhaustively against brute force at small widths.

`solve.ts` applies that to every row and column, repeating until a full pass
changes no cell. It reports `solved`, `stalled` (unknowns remain, no progress
available) or `contradiction`.

## Fairness: line-solvable, not merely unique

The bar every shipped puzzle must clear is **line-solvable**, which is strictly
stronger than having a unique solution.

A puzzle can have exactly one solution and still stall a player into a coin
flip, because reaching that solution needs reasoning deeper than any single line
provides. Uniqueness alone would let such a puzzle ship. Line-solvability is the
guarantee that matters: at every point, some line has something forced.

This is enforced as a **test**, not a runtime check. A picture that needs
guessing fails CI rather than reaching a player. Authoring is then ordinary
iterative art work: draw it, run the test, adjust until it passes. Because
clues are derived from a real picture, `contradiction` should be unreachable and
is treated as a bug in the solver, not a rejected puzzle.

## Artwork

Hand-authored original pictures following the `_shared/icons.ts` convention: a
`grid` of strings where a fill character marks a shaded cell, plus a palette
colour used for the reveal, plus a name.

Subjects are the arcade's own critters and items, consistent with `critters.ts`
and the cabinet badges. Not Nintendo sprites.

Tiers: 5×5, 8×8, 10×10, 12×12, 15×15. Roughly twenty pictures to start, spread
across tiers, with surplus expected — some drafts will fail the line-solvable
test and be redrawn.

This is the largest and least automatable slice of the work, and it decides
whether the cabinet is charming or forgettable. The solver is the easy half.

## Input and feel

A **Fill/Mark toggle** switches between painting shaded cells and painting X
marks for known blanks. Dragging paints a run in the current mode. The same
gesture works on touch and desktop, and one mode at a time keeps the mental
model simple. At 15×15 a player marks far more cells than they fill, so marking
must be as cheap as filling.

No timer, no lives, no fail state.

**Wrong fills are refused immediately.** Tapping a cell that is not part of the
picture flashes red and does not fill — the same language as Arrow Escape
refusing a blocked arrow and glowing the blocker that stopped it. This makes
guessing pointless rather than punished, which is coherent with the
line-solvable guarantee: you never need to guess, so you are never penalised for
declining to. Refusals are counted and reported like Arrow Escape's misses, as
information rather than as a score to defend.

Marks are never validated. A mark is the player's own bookkeeping, and being
wrong about one is part of solving.

## Level curve and progression

Unlike every other cabinet, **the level count is finite and equals the size of
the picture library.** The other games generate levels from a seed and run
forever; a nonogram cannot, because each level is a specific hand-drawn picture.
Level select offers exactly as many levels as there are pictures, and the game
has an end.

For an opening library of twenty:

| Levels | Size  | Pictures |
|--------|-------|----------|
| 1–4    | 5×5   | 4        |
| 5–8    | 8×8   | 4        |
| 9–13   | 10×10 | 5        |
| 14–17  | 12×12 | 4        |
| 18–20  | 15×15 | 3        |

The tiers are derived from the library rather than hard-coded: pictures are
ordered by size, so adding drawings extends the curve without editing a table.
Assignment is deterministic, so a given level is always the same puzzle.

Save key `game:picross`, following the existing storage and migration pattern:
current level, best reached, per-level completion, and the **in-progress board**.
A 15×15 puzzle is ten minutes of work; losing it to a refresh would be the
cabinet's worst moment, so the working grid persists.

## Rendering

Light board on the arcade's dark shell, matching Arrow Escape — correct for a
pencil-and-paper puzzle and already consistent with a shipped cabinet.

Row clues sit in a left gutter, column clues in a top gutter. On completion the
marks fade out and the shaded cells take the picture's colours.

### The layout risk

Clue gutters compete with the grid for a fixed-width canvas. A 15-long line can
hold up to 8 clue numbers, and 15 + 8 = 23 slots across a ~360px mobile canvas
leaves 15px cells — too small to tap reliably or read.

Mitigation: size each puzzle's gutter to the clues it *actually* has rather than
the theoretical maximum. Real pictures need 3–5, giving roughly 19px cells. The
layout tests assert a floor on cell size, so a picture whose clues would squeeze
the board below that fails rather than shipping unreadable.

## Testing

- `line.test.ts` — the deduction core against brute force at small widths;
  known forcing cases; contradiction detection.
- `clues.test.ts` — `runsOf` round-trips against known lines.
- `solve.test.ts` — **every shipped picture is line-solvable.** The load-bearing
  test; a puzzle needing guesswork fails the build.
- `pictures.test.ts` — grids well-formed, rectangular, sized to their tier.
- `level.test.ts` — deterministic assignment, sizes non-decreasing across the
  curve, level count equal to the library size, out-of-range levels clamped.
- `save.test.ts` — migration of corrupt or partial saves, in-progress round-trip.
- `layout.test.ts` — gutter sizing, the cell-size floor, hit-testing.

## Open questions

None blocking. The purist alternative to immediate refusal — no live validation
plus a free "Check" button — was considered and rejected as more frustrating for
a casual cabinet, but would be a small change if it ever reads better in play.
