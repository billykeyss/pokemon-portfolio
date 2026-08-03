import { levelFor } from "./level";
import type { Board } from "./types";

export interface LevelRequest {
  level: number;
}

export interface LevelReply {
  level: number;
  board: Board;
}

/**
 * Builds boards off the main thread.
 *
 * Generation draws candidate boards and keeps the hardest, so its cost scales
 * with how hard a level is asked to be. On the main thread that cost is a
 * freeze — the board stops animating while the *next* level is prepared — which
 * capped the search budget at something well short of what makes good levels.
 * Here the only cost is wall-clock, and the player is busy anyway.
 *
 * `levelFor` memoises per worker instance, so a repeat request for a level this
 * worker has already built returns immediately.
 */
self.onmessage = (event: MessageEvent<LevelRequest>) => {
  const { level } = event.data;
  const reply: LevelReply = { level, board: levelFor(level) };
  self.postMessage(reply);
};
