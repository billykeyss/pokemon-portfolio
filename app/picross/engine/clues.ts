import { BLANK, FILLED, FILL_CHAR, type Clue, type Picture, type Puzzle } from "./types";

/**
 * Run lengths along a line.
 *
 * Anything that is not FILLED breaks a run, so this reads a solution and a
 * partially-solved line the same way. Only meaningful on a complete line.
 */
export function runsOf(line: ArrayLike<number>): number[] {
  const runs: number[] = [];
  let run = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === FILLED) {
      run++;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);

  return runs;
}

/** Build the playable puzzle from its source art, clues and all. */
export function puzzleFrom(picture: Picture): Puzzle {
  const size = picture.grid.length;
  if (size === 0) throw new Error(`picture ${picture.id} is empty`);
  for (const row of picture.grid) {
    if (row.length !== size) {
      throw new Error(`picture ${picture.id} is not square`);
    }
  }

  const solution = new Uint8Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      solution[row * size + col] =
        picture.grid[row][col] === FILL_CHAR ? FILLED : BLANK;
    }
  }

  const rowClues: Clue[] = [];
  for (let row = 0; row < size; row++) {
    rowClues.push(runsOf(solution.subarray(row * size, row * size + size)));
  }

  const colClues: Clue[] = [];
  const column = new Uint8Array(size);
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) column[row] = solution[row * size + col];
    colClues.push(runsOf(column));
  }

  return {
    id: picture.id,
    name: picture.name,
    colour: picture.colour,
    size,
    solution,
    rowClues,
    colClues,
  };
}
