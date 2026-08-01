"""
Slice an AI-generated sprite sheet into per-behavior sprite PNGs.

The generator returns creatures on a flat magenta field. We flood the
background from the edges (rather than keying every magenta pixel) so a
creature that happens to contain a similar hue survives, then crop each
creature to its own bounding box and downsample with NEAREST to keep the
pixel edges crisp.

Usage: python3 tools/build-sprites.py <sheet.webp>
"""
import sys
from collections import deque
from PIL import Image

OUT = "public/bounce/sprites"
CELL_COLS, CELL_ROWS = 3, 4
TARGET = 32
TOLERANCE = 60

# Sheet position (row, col) -> sprite name.
LAYOUT = {
    (0, 0): "fire",
    (0, 1): "heavy",
    (1, 0): "standard",
    (1, 1): "light",
    (1, 2): "ghost",
    (2, 0): "sticky",
    (2, 2): "enemy",
    (3, 0): "magnet",
    (3, 1): "splitter",
    (3, 2): "bomb",
}


def close(a, b, tol=TOLERANCE):
    return all(abs(int(x) - int(y)) <= tol for x, y in zip(a[:3], b[:3]))


def key_background(img):
    """Flood-fill transparent from every edge pixel matching the corner colour."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seed = px[0, 0]

    seen = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        if not close(px[x, y], seed):
            continue
        seen[x][y] = True
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # De-fringe: the generator anti-aliases creature edges into the background,
    # leaving a magenta halo the flood cannot reach because those pixels fall
    # outside the strict tolerance. Peel any edge pixel that still leans toward
    # the background colour, a few passes deep.
    for _ in range(3):
        doomed = []
        for x in range(w):
            for y in range(h):
                if px[x, y][3] == 0:
                    continue
                touches_void = any(
                    0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] == 0
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                )
                if touches_void and close(px[x, y], seed, 115):
                    doomed.append((x, y))
        if not doomed:
            break
        for x, y in doomed:
            px[x, y] = (0, 0, 0, 0)

    return img


def main(path):
    sheet = Image.open(path).convert("RGBA")
    W, H = sheet.size
    cw, ch = W // CELL_COLS, H // CELL_ROWS

    written = []
    for (row, col), name in LAYOUT.items():
        cell = sheet.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
        cell = key_background(cell)

        bbox = cell.getbbox()
        if not bbox:
            print(f"  !! {name}: empty cell, skipped")
            continue
        cropped = cell.crop(bbox)

        # Pad to a square so the creature is not distorted by the resize.
        side = max(cropped.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))

        out = square.resize((TARGET, TARGET), Image.NEAREST)
        # Hard alpha: anything semi-transparent becomes fully on or fully off,
        # otherwise scaled-up sprites get muddy halos.
        px = out.load()
        for x in range(TARGET):
            for y in range(TARGET):
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 255 if a > 128 else 0)

        dest = f"{OUT}/{name}.png"
        out.save(dest)
        written.append(f"{name} ({cropped.width}x{cropped.height} -> {TARGET})")

    print("Wrote:")
    for w_ in sorted(written):
        print("  " + w_)


if __name__ == "__main__":
    main(sys.argv[1])
