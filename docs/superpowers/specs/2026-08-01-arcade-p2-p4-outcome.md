# Arcade P2–P4 — What Was Built

Date: 2026-08-01
Status: shipped
Follows: `2026-07-31-arcade-shell-potion-sort-design.md` (P0, P1)

Sub-projects P2 (sprite pipeline), P3 (Traffic Jam) and P4 (Shelf Sort) are
done. This records what they became and the decisions that only surfaced once
they were real, so the next person does not re-derive them.

## Routes

| Route | Game |
|---|---|
| `/game` | Dashboard, four live cabinets |
| `/bounce/bouncedex` | Bouncedex |
| `/sort` | Potion Sort |
| `/traffic` | Traffic Jam |
| `/shelf` | Shelf Sort |

## P2 — Sprite pipeline

```
assets/sprites/raw/<game>/<name>.webp  --pnpm sprites-->  public/game/<game>/<name>.png
```

Generated art arrives on a flat magenta backdrop *with a drop shadow the model
paints regardless of the prompt*. Keying it out is a **projection test**, not a
colour-distance one: a pixel is backdrop if it is a scaled version of the
backdrop colour. Two things fall out of that choice, and both were needed:

- purple car bodies survive, where a "red and blue both exceed green" test eats
  them;
- the drop shadow is removed, where a tight colour-distance test leaves a halo.

The lower bound on the scale factor is what spares near-black outlines, which
would otherwise project onto the backdrop's colour line at a scale near zero.
Flood-filling inward from the border rather than testing pixels independently is
what protects a magenta pixel *enclosed* by the sprite.

The PNG codec is hand-rolled over `node:zlib` so the pipeline needs no install
step, and `sips` (macOS built-in) handles webp. Raw sources are committed beside
the output, so the sprites reproduce with no image generator in the loop.

### Art coverage, and the gap

Five car sprites exist and are used. **The free image-generation quota ran out
part-way through**, so:

- three-cell trucks in Traffic Jam have no generated art and fall back to a
  drawn shape. This reads as a different kind of vehicle, which is correct, not
  as a broken car;
- Shelf Sort goods are hand-authored 10×10 pixel grids. At the size a slot
  draws them, a placed silhouette beats a downscaled illustration anyway — this
  is a better outcome than the original plan, not a compromise. The number of
  grids is also what caps the difficulty curve.

To add generated art later: drop files in `assets/sprites/raw/<game>/`, run
`pnpm sprites`. The renderer prefers a loaded sprite and falls back when one is
absent, so no code changes are needed.

## Shared extraction

With P3 as a genuine second consumer, two modules moved into
`app/game/_shared/`:

- `search.ts` — state-space search over a `SearchSpec`. Gained a breadth-first
  strategy P1 never needed, because Traffic Jam scores the player on move count
  so its par must be a true shortest path. Paths reconstruct from parent
  pointers rather than being copied per node.
- `phases.ts` — the animation timeline. Every game commits its move instantly
  and lets the renderer walk a scripted timeline to catch up.

`search` also gained `maxDepth`, and with it the distinction between
`unknown/"nodeCap"` (ignorance) and `unknown/"depthCap"` (a *proof* that no
solution exists within the bound). Collapsing those two is how an unsolvable
board reaches a player; they must stay distinct.

## P3 — Traffic Jam

6×6 sliding-block puzzle. Player car escapes right along the exit row. A slide
of any distance is one move, so par counts decisions rather than cells.

**Generation was the hard part.** Three findings, largest first:

1. **Difficulty lives in chained blockers.** A board of independent blockers is
   shallow however many it has — each slides aside in one move. Pinning blockers
   behind one another took level 24 from par 8 to par 14 *and* halved generation
   time.
2. **Asking for the exact par is what made it slow.** Generation only needs to
   know whether a board clears a bar, so the search is depth-bounded and stops
   early on exactly the boards worth keeping.
3. **The move ceiling must sit where a 6×6 can actually supply boards.** Chasing
   sixteen-move pars stalled level loads for seconds. The ceiling is nine;
   density carries the late game.

Worst-case generation: **8.5s → 1.2s**, mean ~350ms. The next level is built in
the background during play, so transitions are instant.

Two correctness constraints in the layout, both load-bearing: the player never
starts already escaped, and no *other* horizontal vehicle sits on the exit row
(it could never clear the path, making the board unsolvable by construction).

## P4 — Shelf Sort

**Built twice.** The first version was the wrong game.

### The mistake

Shipped first was a shelf wall plus a seven-slot holding tray: tap goods into
the tray, three of a kind clear, game over if the tray fills with seven
mismatches. That is a faithful implementation — of **Triple Match 3D / Zen
Match**, whose signature mechanic is exactly that tray. It is not Goods Sort,
and it was wearing that name.

Worth recording *why*, because the reasoning looked sound at the time: an early
sketch had "an item may move to a shelf only if it already holds one of that
type", which was judged too easy and abandoned for the tray. The real game
solves the same problem differently — three-slot shelves plus items buried
behind other items — and that is where its difficulty comes from. Checking what
the genre actually was would have cost one search.

### What it is now

- Shelves are **three slots wide**; each slot stacks items front-to-back.
- Only the **front** item of a slot can be moved. Ones behind show dimmed,
  smaller and offset up — visible but out of reach.
- A move takes a front item to **any shelf with a free slot**. Which slot it
  lands in is not a decision the game asks for, so the destination is a shelf
  and the code never names a slot.
- **Three matching fronts on one shelf clear**, and clearing cascades: uncovering
  what was behind can complete another match immediately.
- **Deadlock is real**: every shelf full with no match is a dead board.

Two things carry the design:

- The difficulty dial is **how the shelf count compares to the type count**, not
  the item count. One more shelf than types means every item has its own slot
  and the whole board is visible — a clean tutorial. As shelves fall behind,
  items bury each other.
- **Free slots stay at three.** They are the only reason anything can move;
  below three, boards deadlock before they get interesting.

Buried items are drawn large enough to *identify*, not merely to notice.
Knowing something is behind is not a decision a player can act on; knowing it is
the third apple is the entire reason to show it.

Generation is cheap (2–5ms per level) — most random deals are solvable, so the
first attempt usually stands. The curve flattens around level 30 when both dials
max out; raising it further means more kinds of goods, which means more item
art. The type cap is set by how many are drawn, not by anything in the puzzle.

## Cross-cutting fix

Play-testing found a stale-ref bug in **both** Potion Sort and Traffic Jam: the
pointer handler reads `selectedRef`, which was only synced during render, so two
quick taps dropped the selection and the move with it. Selection now writes the
ref before the state.

## Operational note

`public/sw.js` is cache-first for same-origin GETs. During development it
repeatedly served stale JS and CSS — including a stylesheet predating a new
route, which silently broke a layout. In production this is fine (asset
filenames are hashed), but when a change appears not to take effect while
developing, unregister the service worker and clear its caches first.

## Testing

536 tests across 34 files, all passing. `pnpm build` exports every route
statically. Each game was additionally driven to a win through its real UI in a
browser — the pour, the drive-out, and the shelf-to-tray flight were all
verified by playing, not by assertion.

## Not done

- Generated art for trucks and shelf goods (quota; pipeline is ready).
- Level select for Traffic Jam and Shelf Sort (Potion Sort has one).
- Sound, leaderboards, daily challenges.
