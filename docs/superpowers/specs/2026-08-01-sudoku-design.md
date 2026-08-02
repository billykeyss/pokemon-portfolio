# Sudoku — design

Date: 2026-08-01
Route: `/sudoku`
Status: approved, ready to plan

A Sudoku for the arcade, built around the premise that the tedious parts of the
game are bookkeeping, not thinking. Every piece of bookkeeping is automated so
that what is left is deduction.

## Decisions

Four product calls were made before design, and everything below follows from
them.

**Notation is fully automatic.** Every empty cell always displays its legal
candidates, computed from the current board. Placing a digit prunes it from
every peer immediately. The player never writes a pencil mark and never erases
one.

**Wrong digits are flagged against the solution.** The game holds the solved
grid. A digit that is not the true answer turns red the moment it lands and
stays red until changed. A running mistake count is displayed. There are no
lives and no failure state — the count only ever goes up.

**Both input directions are supported, cell-first by default.** Tap a cell then
a digit, or arm a digit and paint cells with it. Arming a digit lights every
cell already holding it and every empty cell that could still take it.

**Puzzles are organised into four difficulty tiers, endlessly.** Easy, Medium,
Hard, Expert. Each tier is an endless seeded stream, with solve count and best
time tracked per tier. There is no level ladder and no `LevelSelect`.

**Hints explain themselves in one panel.** A single tap opens a panel naming the
technique, stating the argument in plain English, and lighting the board to
match, with Apply and Close beneath it.

## Rendering: DOM, not canvas

Every other game in this arcade renders to a canvas driven by `useGameLoop`.
Sudoku does not, and the break is deliberate.

Sudoku is a text grid with no continuous motion. On canvas it would mean
hand-rolled font metrics for 81 digits plus up to 729 candidate glyphs per
frame, plus hit-testing, a focus model, and keyboard handling — all of which
DOM provides directly. CSS grid lays out the board, a nested 3×3 of spans
renders candidates, highlights are class names, and arrow-key navigation falls
out of real focus. The page is also legible to a screen reader, which no canvas
game here is.

Nothing animates continuously, so there is no game loop. The only recurring
work is a one-second timer tick.

The cost is that this is the one game whose look is matched in CSS by hand
rather than inherited from `pixelGrid.ts`. `PixelPanel` and `PixelButton` from
`_shared/pixel-ui` carry the arcade chrome, and the accent colour is declared in
the registry like every other cabinet.

## Engine

Pure modules under `app/sudoku/engine/`. No React, no DOM, all node-testable.

### `types.ts`

`Digit` is 1–9. `Cell` is a digit or 0 for empty. `Grid` is 81 cells.

```ts
interface Puzzle { givens: Grid; solution: Grid; tier: Tier; seed: number }
interface Board  { puzzle: Puzzle; entries: Grid }
type Tier = "easy" | "medium" | "hard" | "expert"
```

`givens` and `entries` are separate grids rather than one merged array. Merging
them saves an array and immediately makes "can the player erase this cell?"
ambiguous.

### `grid.ts`

Precomputed index math: `UNITS` (27 units — 9 rows, 9 columns, 9 boxes, each 9
indices), `PEERS[i]` (the 20 cells constraining cell `i`), `unitsOf(i)`,
`rowOf`/`colOf`/`boxOf`. Computed once at module load; every other module reads
them.

### `candidates.ts`

The auto-notation core. `allCandidates(board)` returns 81 bitmasks, nine bits
each, recomputed from scratch on every move.

There is deliberately no incremental cache. A cache is the obvious optimisation
and it is precisely the thing that would let displayed notes drift out of sync
with the board — and "the notes are always correct" is the whole feature. A full
recompute over 81 cells of bitwise operations is not a cost worth risking that
for. Bitmasks also make "exactly one candidate" a popcount.

### `solve.ts`

`countSolutions(grid, cap = 2)` — backtracking that stops at `cap`. This is the
uniqueness check used during generation. `solve(grid)` returns the first
solution.

### `techniques.ts`

`nextDeduction(board)` returns the cheapest available deduction, or null. It
returns *reasoning*, not a move: each variant carries every cell, unit and digit
its argument rests on, which is what lets one value drive both the explanation
text and the board highlight.

```ts
type Deduction =
  | { kind: "naked-single";      cell: Idx; digit: Digit }
  | { kind: "hidden-single";     cell: Idx; digit: Digit; unit: Unit; because: Idx[] }
  | { kind: "locked-candidates"; digit: Digit; box: Unit; line: Unit; removes: Elim[] }
  | { kind: "naked-subset";      cells: Idx[]; digits: Digit[]; unit: Unit; removes: Elim[] }
  | { kind: "hidden-subset";     cells: Idx[]; digits: Digit[]; unit: Unit; removes: Elim[] }
  | { kind: "x-wing";            digit: Digit; rows: Unit[]; cols: Unit[]; removes: Elim[] }
```

`Unit` is one of the 27 units, identified by kind and index. `Elim` is a
candidate removal, `{ cell: Idx; digit: Digit }` — the eliminations a technique
justifies, which the hint panel highlights and which `grade` applies when
walking a puzzle to completion.

`techniqueRank(kind)` orders them by difficulty. `applyDeduction(board, d)`
returns the resulting board.

### `explain.ts`

Pure: `Deduction → Explanation`, where `Explanation` is
`{ headline, body, highlight: { cells, units, digits } }`.

Keeping the wording out of the components means hint text has unit tests, and
the sentence and the board highlight are generated from the same value, so they
cannot disagree.

### `grade.ts`

`grade(puzzle)` runs `nextDeduction` to completion and returns the rank of the
hardest technique required, mapped to a tier — or null if the puzzle cannot be
solved by the implemented techniques.

Difficulty is graded by technique required, not by clue count. Clue count is a
bad proxy: a 28-given puzzle can be trivial and a 30-given one brutal.

**The ladder is shifted down one rung from pencil-and-paper convention, because
of the auto-candidates decision.** Naked singles — a cell with one remaining
candidate — are the backbone of paper Easy, but this game draws them for the
player, so they cost nothing. Tiers are graded against the game being built:

| Tier | Hardest technique required |
| --- | --- |
| Easy | hidden singles |
| Medium | + locked candidates (pointing / claiming) |
| Hard | + naked and hidden pairs and triples |
| Expert | + X-wing and beyond |

### `generate.ts`

Seeded from `_shared/rng` so a seed always reproduces a puzzle.

1. `fullGrid(rng)` — randomised backtracking to a complete valid grid.
2. `carve(solution, rng, tier)` — remove givens in random order, keeping a
   removal only while `countSolutions === 1`.
3. `grade` the result; retry from step 2 until the tier matches or an attempt
   cap is hit.

`puzzleFor(tier, seed)` is the entry point.

### `save.ts`

Per tier: `{ solved: number, bestMs: number | null }`. Plus one in-progress
board so a reload resumes where the player left off. Built on `_shared/storage`,
with the same coerce-anything-invalid discipline the other games use.

### `history.ts`

Undo/redo over `{ index, before, after }` entries. Unlimited depth.

## UI

```
app/sudoku/
  page.tsx           state, keyboard, timer, next-puzzle prefetch
  ui/Board.tsx       the 9×9
  ui/Cell.tsx        given / entered / wrong / candidates
  ui/Keypad.tsx      digits with remaining counts
  ui/HintPanel.tsx   headline, body, Apply, Close
  ui/TierSelect.tsx  four tiers with solve count and best time
  ui/highlight.ts    pure highlight computation
```

`highlight.ts` is pure: `(board, selection, armedDigit, hint) → HighlightMap`
over 81 cells. Layered kinds, in precedence order:

- `hint` — cells the open explanation rests on
- `conflict` — a wrong entry
- `selected` — the focused cell
- `same-digit` — every cell holding the selected or armed digit
- `candidate-of-armed` — empty cells that could still take the armed digit
- `peer` — the selected cell's row, column and box

Keeping every highlight rule in one pure function is what makes this testable
rather than eyeballed. It is also the feature most likely to be subtly wrong.

## Quality-of-life set

Auto-candidates. Row, column and box highlighting from the selected cell.
Same-digit highlighting. Digit-first arming that lights every cell a digit could
still take. Wrong entries red on contact, with a running mistake count.
Unlimited undo and redo. A keypad showing each digit's remaining count, greyed
out at nine placed. Full keyboard control: arrow keys to move, 1–9 to place,
backspace to clear, `u` to undo, `shift+u` to redo. A pausable timer that
auto-pauses on tab blur. Resume across reloads.

## Testing

Every engine module is pure and tested with vitest in the node environment,
colocated as `*.test.ts`, matching the repo.

- **generate** — property tests: exactly one solution; `givens ⊆ solution`;
  solution is a valid complete grid; a seed reproduces its puzzle exactly;
  grading is stable for a seed.
- **candidates** — a filled cell offers no candidates; no candidate conflicts
  with a peer; a solved board has no candidates anywhere.
- **techniques** — hand-built boards, one per technique, asserting the exact
  deduction found, including the cells its argument names.
- **explain** — every `Deduction` variant yields a non-empty headline and body,
  and every cell it names is on the board.
- **highlight** — the layering and precedence rules.
- **generation cost** — measured against a budget, with the next puzzle
  prefetched during play. This is the pattern that took Traffic Jam from 8.5s
  per level to 1.2s.

## Out of scope

Leaderboards and multiplayer (there is no backend). A daily puzzle. Manual
pencil marks — auto-candidates replace them. Canvas rendering.

## Risks

**Expert generation cost.** Puzzles genuinely requiring an X-wing are rare, so
carve-and-grade may loop many times to hit the tier. Mitigations, in order:
measure first; prefetch the next puzzle during play; if still too slow, pre-bake
a small bank of Expert seeds at build time rather than making the player wait.

**Expert may be unreachable.** If X-wing-requiring puzzles cannot be generated
within budget at all, Expert is redefined as the hardest tier reachable in
budget rather than being left broken.
