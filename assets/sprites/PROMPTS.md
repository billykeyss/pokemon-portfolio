# Sprite generation prompts

The five car sprites in `raw/traffic/` were generated with the Z-Image Turbo
space on Hugging Face. Recording the exact prompt and settings here is what
makes the art reproducible — the raw files are committed, but a future addition
has to match the existing set or it will not sit alongside it.

## Settings that matter

| Setting | Value | Why |
|---|---|---|
| seed | `7` | **Fixed.** The whole set shares one seed, which is why the cars share a pose and proportions. Changing it re-rolls the look. |
| resolution | `1024x1024 ( 1:1 )` | Cars trim to roughly 1:2 naturally, which is the footprint a two-cell vehicle needs. |
| steps | `8` | |
| random_seed | `false` | |

## Prompt scaffold

Only the subject changes. Everything after it is fixed, and each clause earns
its place:

```
Top-down overhead view of a single <SUBJECT>, retro 16-bit pixel art game
sprite, viewed directly from straight above, centered, plain flat solid magenta
background, chunky pixels, bold black outline, flat saturated colors, no
gradients, no text
```

- **"plain flat solid magenta background"** — the pipeline keys this out. Do not
  change the colour; the projection test is calibrated to a magenta backdrop and
  a purple or pink subject already sits uncomfortably close to it.
- **"no shadows"** does not work. The model paints a drop shadow regardless. The
  pipeline removes it, so leave the clause out rather than fighting it.
- Avoid subjects whose body colour is magenta or hot pink. Purple is the closest
  the keying reliably survives, and it is already used.

## Generated so far

| File | Subject | Resolution |
|---|---|---|
| `raw/traffic/car-red.webp` | `red sedan car` | 1:1 |
| `raw/traffic/car-blue.webp` | `blue hatchback car` | 1:1 |
| `raw/traffic/car-green.webp` | `green hatchback car` | 1:1 |
| `raw/traffic/car-yellow.webp` | `yellow taxi car` | 1:1 |
| `raw/traffic/car-purple.webp` | `purple sports car` | 1:1 |
| `raw/traffic/truck-white.webp` | `long white box delivery truck, elongated rectangular cargo van` | 9:16 |
| `raw/traffic/truck-silver.webp` | `long silver grey box delivery truck, elongated rectangular cargo van` | 9:16 |

Trucks key slightly worse than the cars (72-76% of the frame removed against
81%) because the 9:16 frame is mostly vehicle, not because the cut is dirtier —
both come out with zero magenta fringe.

## Subjects the space refuses

The space runs a classifier on the *output*, and when it fires it returns a
photograph of a chalkboard reading "maybe not safe" instead of an error. It is
easy to mistake for a bug: the response looks successful, carries a normal image
URL, and comes back at 1:1 whatever resolution was asked for. The same URL comes
back every time, so a retry is never worth it.

Warm-coloured box trucks trip it. `orange` and `brown` were both refused, at a
fixed seed and a random one, and reworded twice. `white` and `silver grey` pass
with the identical prompt around them, which is why the second truck is silver —
the pair is less distinct than white and orange would have been.

If a subject comes back as the chalkboard, change the colour rather than the
wording. Rewording did nothing; colour was the whole difference.

## Quota

The free ZeroGPU quota is account-wide — every image space on Hugging Face draws
from the same daily budget, so switching spaces does not help. It refills daily
and is worth roughly six generations at these settings, which is the unit to
plan a session around: pick the six subjects that matter before starting, rather
than discovering the ceiling half-way through a set.

Unlike the classifier, exhaustion is a real error and says so.

## Still to generate

Filled by hand-drawn pixel art that is good enough to ship, so these are
upgrades rather than blockers.

**Shelf Sort goods** (`raw/shelf/`) — currently hand-drawn 10x10 grids in
`app/shelf/engine/items.ts`, which honestly read better at the size a shelf slot
draws them than a downscaled illustration would. If replacing them, generate one
per type:

```
apple, milk carton, loaf of bread, soda can, wedge of cheese,
egg, juice bottle, bunch of purple berries
```

and load them through `useSprites` the way Traffic Jam does, keeping the grids
as the fallback.

**Not the cabinet icons.** Every game already has one and they are drawn on
purpose — see the comment in `app/game/_shared/icons.ts`. They are 12x12, which
is small enough that a downscaled illustration turns to mush, so generating them
would be a downgrade rather than a gap being filled.

## Running the pipeline

```
pnpm sprites
```

Reads everything in `raw/<game>/`, keys out the backdrop, trims, downscales, and
writes `public/game/<game>/<name>.png`. No image generator in the loop.
