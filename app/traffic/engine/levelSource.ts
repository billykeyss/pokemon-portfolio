import { levelFor } from "./level";
import type { Board } from "./types";
import type { LevelReply, LevelRequest } from "./generate.worker";

/**
 * Supplies boards, off the main thread when it can and on it when it cannot.
 *
 * The fallback is the point. A worker can fail to start for reasons that have
 * nothing to do with this game — an environment without `Worker`, a bundler
 * that did not emit the chunk, a stricter CSP — and none of those should turn
 * into a broken game. When it cannot start, this behaves exactly as the game
 * did before workers existed: generation runs inline and blocks.
 */
export class LevelSource {
  private worker: Worker | null = null;
  private readonly cache = new Map<number, Board>();
  private readonly waiting = new Map<number, ((board: Board) => void)[]>();

  constructor() {
    this.worker = this.start();
  }

  private start(): Worker | null {
    if (typeof Worker === "undefined") return null;

    try {
      const worker = new Worker(new URL("./generate.worker.ts", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (event: MessageEvent<LevelReply>) => {
        const { level, board } = event.data;
        this.cache.set(level, board);

        const pending = this.waiting.get(level) ?? [];
        this.waiting.delete(level);
        for (const resolve of pending) resolve(board);
      };

      // A worker that dies mid-session must not strand every later request, so
      // it is dropped and everything falls back to inline generation.
      worker.onerror = () => {
        this.worker = null;
        for (const [level, pending] of this.waiting) {
          for (const resolve of pending) resolve(levelFor(level));
        }
        this.waiting.clear();
      };

      return worker;
    } catch {
      return null;
    }
  }

  /** A board that is already built, or null if one is not ready yet. */
  ready(level: number): Board | null {
    return this.cache.get(level) ?? null;
  }

  /** Ask for a board without waiting for it. Cheap to call repeatedly. */
  prefetch(level: number): void {
    if (this.cache.has(level) || this.waiting.has(level)) return;
    if (this.worker === null) return;

    this.waiting.set(level, []);
    this.worker.postMessage({ level } satisfies LevelRequest);
  }

  /**
   * A board, however it has to be obtained. Resolves immediately when one is
   * already built, and synchronously — blocking — when there is no worker.
   */
  request(level: number): Promise<Board> {
    const cached = this.cache.get(level);
    if (cached !== undefined) return Promise.resolve(cached);

    if (this.worker === null) {
      const board = levelFor(level);
      this.cache.set(level, board);
      return Promise.resolve(board);
    }

    return new Promise<Board>((resolve) => {
      const pending = this.waiting.get(level);
      if (pending !== undefined) {
        pending.push(resolve);
        return;
      }

      this.waiting.set(level, [resolve]);
      this.worker?.postMessage({ level } satisfies LevelRequest);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.waiting.clear();
  }
}
