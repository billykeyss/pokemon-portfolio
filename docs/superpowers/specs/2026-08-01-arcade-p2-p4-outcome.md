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
- Shelf Sort items are hand-authored 10×10 pixel grids. At tray size they draw
  about 40px across, where a placed silhouette beats a downscaled illustration
  anyway — this is a better outcome than the original plan, not a compromise.

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

Shelf wall of item columns plus a holding tray. Only the front item of a column
is reachable; three matching items on the tray clear together. **Filling the
tray with items that cannot pair is a real fail state** — a wrong take can
strand you, which is what separates this from the sorting games.

- Tray size, not item count, is the difficulty dial: at seven slots almost any
  order works out, at five the player must think about what a take strands. It
  never drops below five, the point where one wrong pick stops being
  recoverable.
- Shelves and tray are sized independently. The tray always holds more slots
  across the same width, so a shared item size left the shelves — the part being
  read — small and marooned. The item in flight scales between the two sizes so
  it does not overflow the slot it lands in.
- Generation is cheap here (~200ms for 30 levels): a generous tray forgives a
  lot, so most random deals are solvable and the first attempt usually stands.

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
