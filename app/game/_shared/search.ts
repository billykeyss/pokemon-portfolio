/**
 * Generic state-space search for the puzzle games.
 *
 * Every puzzle here is the same shape underneath — states, legal moves, a goal
 * test — and differs only in what a state *is*. Handing that over as a spec
 * keeps one tested search shared between games instead of one per game.
 *
 * The canonical key is the load-bearing part. Two states that a player cannot
 * tell apart must produce the same key, or the visited set barely prunes and
 * the search explodes.
 */
export interface SearchSpec<S, M> {
  /** Identity of a state. Equivalent states MUST agree. */
  key(state: S): string;
  moves(state: S): M[];
  apply(state: S, move: M): S;
  solved(state: S): boolean;
  /** Depth-first only: higher scores are explored first. */
  score?(state: S, move: M): number;
}

export type SearchResult<M> =
  | { status: "solved"; moves: M[] }
  | { status: "unsolvable" }
  /**
   * The search gave up. `reason` says which limit stopped it, and the two mean
   * very different things: "nodeCap" is ignorance, while "depthCap" is a proof
   * that no solution exists within `maxDepth` — which is a useful positive
   * result when you are asking whether a puzzle is *hard enough*.
   */
  | { status: "unknown"; reason: "nodeCap" | "depthCap" };

export interface SearchOptions {
  /**
   * Expansion budget. On exceeding it the search returns "unknown" rather than
   * claiming a puzzle is unsolvable it merely failed to crack.
   */
  nodeCap?: number;
  /**
   * "bfs" returns a shortest solution — use it when the move count is the score
   * a player is judged against. "dfs" returns *a* solution sooner and with less
   * memory, which is what level generation wants when it only needs to know
   * whether a candidate is solvable at all.
   */
  strategy?: "bfs" | "dfs";
  /**
   * Breadth-first only: stop after exploring this many moves deep. Finishing
   * with a non-empty frontier yields `unknown`/`depthCap`, which proves the
   * shortest solution is longer than this bound without paying to find it.
   */
  maxDepth?: number;
}

export const DEFAULT_NODE_CAP = 200_000;

interface Node<S, M> {
  state: S;
  /** The move that produced this state, or null at the root. */
  move: M | null;
  parent: number;
  depth: number;
}

/** Walk parent pointers back to the root; cheaper than copying a path per node. */
function pathTo<S, M>(nodes: Node<S, M>[], index: number): M[] {
  const moves: M[] = [];
  for (let i = index; i > 0; i = nodes[i].parent) {
    const { move } = nodes[i];
    if (move !== null) moves.push(move);
  }
  return moves.reverse();
}

export function search<S, M>(
  start: S,
  spec: SearchSpec<S, M>,
  options: SearchOptions = {},
): SearchResult<M> {
  const { nodeCap = DEFAULT_NODE_CAP, strategy = "dfs", maxDepth = Infinity } = options;

  if (spec.solved(start)) return { status: "solved", moves: [] };

  const nodes: Node<S, M>[] = [{ state: start, move: null, parent: -1, depth: 0 }];
  const visited = new Set<string>([spec.key(start)]);
  const frontier: number[] = [0];
  let head = 0;
  let expansions = 0;
  let truncatedByDepth = false;

  while (strategy === "bfs" ? head < frontier.length : frontier.length > 0) {
    if (expansions >= nodeCap) return { status: "unknown", reason: "nodeCap" };

    const index = strategy === "bfs" ? frontier[head++] : (frontier.pop() as number);
    const node = nodes[index];

    // Everything at this depth is a leaf as far as this search is concerned;
    // note that solutions may exist below and keep draining the frontier.
    if (node.depth >= maxDepth) {
      truncatedByDepth = true;
      continue;
    }

    expansions++;

    const moves = spec.moves(node.state);
    if (strategy === "dfs" && spec.score !== undefined) {
      const score = spec.score;
      // Ascending, because a stack pops from the end — best explored first.
      moves.sort((a, b) => score(node.state, a) - score(node.state, b));
    }

    for (const move of moves) {
      const next = spec.apply(node.state, move);
      const key = spec.key(next);
      if (visited.has(key)) continue;

      const child =
        nodes.push({ state: next, move, parent: index, depth: node.depth + 1 }) - 1;
      if (spec.solved(next)) return { status: "solved", moves: pathTo(nodes, child) };

      visited.add(key);
      frontier.push(child);
    }
  }

  // Draining the frontier proves there is no solution — but only if nothing was
  // pruned on the way. A depth-truncated search has proved something weaker:
  // no solution within maxDepth.
  return truncatedByDepth
    ? { status: "unknown", reason: "depthCap" }
    : { status: "unsolvable" };
}

/** The next move a solver would make from here, or null if there is none. */
export function firstMove<S, M>(
  start: S,
  spec: SearchSpec<S, M>,
  options?: SearchOptions,
): M | null {
  const result = search(start, spec, options);
  return result.status === "solved" && result.moves.length > 0 ? result.moves[0] : null;
}
