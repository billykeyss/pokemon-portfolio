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

| File | Subject |
|---|---|
| `raw/traffic/car-red.webp` | `red sedan car` |
| `raw/traffic/car-blue.webp` | `blue hatchback car` |
| `raw/traffic/car-green.webp` | `green hatchback car` |
| `raw/traffic/car-yellow.webp` | `yellow taxi car` |
| `raw/traffic/car-purple.webp` | `purple sports car` |

## Still to generate

The free ZeroGPU quota ran out part-way through, and it is account-wide — every
image space on Hugging Face draws from the same daily budget, so switching
spaces does not help. Both gaps are currently filled by hand-drawn pixel art
that is good enough to ship, so these are upgrades rather than blockers.

**Traffic Jam trucks** (`raw/traffic/`) — three-cell vehicles currently use the
drawn sprite in `app/traffic/render/truck.ts`. Use a 9:16 resolution so the art
comes out long:

```
truck-white   long white box delivery truck, elongated rectangular cargo van
truck-orange  long orange box delivery truck, elongated rectangular cargo van
```

Then in `app/traffic/render/draw.ts`, add the names to `SPRITE_NAMES` and drop
the `vehicle.len !== 2` guard in `spriteFor` so trucks pick up their art.

**Shelf Sort goods** (`raw/shelf/`) — currently hand-drawn 10x10 grids in
`app/shelf/engine/items.ts`, which honestly read better at tray size than a
downscaled illustration would. If replacing them, generate one per type:

```
apple, milk carton, loaf of bread, soda can, wedge of cheese,
egg, juice bottle, bunch of purple berries
```

and load them through `useSprites` the way Traffic Jam does, keeping the grids
as the fallback.

## Running the pipeline

```
pnpm sprites
```

Reads everything in `raw/<game>/`, keys out the backdrop, trims, downscales, and
writes `public/game/<game>/<name>.png`. No image generator in the loop.
