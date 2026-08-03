# Sudoku — build outcome and follow-ups

Date: 2026-08-02
Route: `/sudoku`
Spec: `2026-08-01-sudoku-design.md` · Plan: `../plans/2026-08-01-sudoku.md`

Thirteen planned tasks, all shipped and individually reviewed, plus a final
whole-branch review, one fix wave and a residual pass. 30 commits. 1038 tests
repo-wide, up from 781 before this work.

Everything in the approved spec is present and wired: auto-candidates, row /
column / box and same-digit highlighting, digit-first arming, solution-checked
entries with a mistake count, unlimited undo and redo, per-digit remaining
counts, full keyboard control, a tab-blur-aware timer, resume across reloads,
four measured difficulty tiers, and hints that state their own reasoning and
light the board to match. Nothing declared out of scope crept in.

## Known limitations

**Expert is under-served.** Only six solving techniques are implemented, so a
request for Expert lands on its target tier roughly one time in ten; the rest
return a lower-graded board, labelled honestly at the tier it actually is.
Puzzles requiring an X-wing are genuinely rare, and anything needing more than
the implemented set grades as ungradeable and is discarded. Adding one further
technique — swordfish or XY-wing — would widen what can be graded and lift the
rate. This was anticipated in the spec's risk section.

**`locked-candidates` covers pointing, not claiming.** It eliminates along a
line from a box, but not into a box from a line. A weaker solver grades some
puzzles harder than a full one would; nothing is incorrect, and the explanation
text describes only the direction that is implemented.

**Presentational components carry no unit tests**, by design — every rule they
display is tested in `ui/highlight.ts`. Two consequences are worth knowing:
the amber strike that marks hint eliminations in `Cell.tsx` is verified only by
eye, and two of the page's state fixes (the persist effect's `save` dependency,
and solve idempotency) are cross-render effect contracts with no pure function
to lift, so they rest on a browser session rather than a test. Closing those
needs a React testing harness in the repo.

## Follow-ups, in the order I would take them

1. **The hint reasons over a board the player is not shown.** With a wrong entry
   on the board, `showHint` deduces from a grid with disagreeing entries zeroed
   — correctly, so it cannot recommend a move the game then scores as a mistake
   — but the displayed candidates still come from the real board. So a struck
   digit may not be rendered at all, or the panel can assert about a cell showing
   no marks. Deriving the displayed candidates from the same grid while a hint is
   open would close it; so would telling the player to clear the red entries
   first.
2. **`TierSelect` is positioned against the content column, not the viewport** —
   the same class of bug that was fixed in `HintPanel`. It keeps its scrim, so
   there is at least a cue that it opened, but on a short window it can sit
   partly below the fold.
3. **The longest explanation does not fit a short laptop window.** The x-wing
   body needs a 736px viewport to clear the board; a 1366×768 window gives about
   685. The panel is never off-screen and the page scrolls to reach it, but the
   board and the full argument cannot both be visible at that height.
4. **Add one more solving technique** to lift Expert's hit rate — see above.
5. **The Picross cabinet icon will clash with Sudoku's.** Both games are grids.
   Sudoku's badge is a 3×3 block with two tinted cells; whoever draws Picross's
   should differentiate deliberately rather than discover the collision after.

## Notes for anyone working in here

- `pnpm build` and `pnpm dev` share `.next`. Running a build while a dev server
  is up makes every static asset 404 until you stop it, delete `.next`, and
  restart. This has cost real time more than once.
- A stale service worker can serve old client chunks against new HTML, which
  presents as a hydration error and a page missing its newest styles.
  `navigator.serviceWorker.getRegistrations()` first when a page looks wrong.
- Generation cost is measured, not assumed: easy ~16ms, medium ~26ms, hard
  ~137ms, expert ~317ms on the test seeds, with a worst observed 1196ms. The
  budget test samples four seeds across four tiers against a 3000ms ceiling —
  it was originally one seed, which happened to be twice as fast as average and
  hid a second of main-thread freeze.
