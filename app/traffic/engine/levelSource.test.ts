import { afterEach, describe, expect, it, vi } from "vitest";
import { LevelSource } from "./levelSource";
import { paramsForLevel } from "./level";
import { solve } from "./solve";

/**
 * A stand-in worker that never actually generates anything, so the client's
 * bookkeeping can be tested without paying for a real board.
 */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((e: { data: { level: number; board: unknown } }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readonly posted: number[] = [];
  terminated = false;

  constructor() {
    FakeWorker.last = this;
  }

  postMessage(request: { level: number }) {
    this.posted.push(request.level);
  }

  terminate() {
    this.terminated = true;
  }

  /** Answer a request the way the real worker would. */
  reply(level: number, board: unknown) {
    this.onmessage?.({ data: { level, board } });
  }
}

const withWorker = () => {
  vi.stubGlobal("Worker", FakeWorker);
  return new LevelSource();
};

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.last = null;
});

describe("with a worker", () => {
  it("asks the worker rather than generating inline", () => {
    const source = withWorker();
    source.request(9);
    expect(FakeWorker.last?.posted).toEqual([9]);
  });

  it("resolves once the worker answers", async () => {
    const source = withWorker();
    const pending = source.request(4);
    FakeWorker.last?.reply(4, { size: 6, arrows: "sentinel" });
    await expect(pending).resolves.toEqual({ size: 6, arrows: "sentinel" });
  });

  it("asks only once for a level already in flight", () => {
    const source = withWorker();
    source.request(5);
    source.request(5);
    source.prefetch(5);
    expect(FakeWorker.last?.posted).toEqual([5]);
  });

  it("settles every caller waiting on the same level", async () => {
    const source = withWorker();
    const a = source.request(7);
    const b = source.request(7);
    FakeWorker.last?.reply(7, { size: 6, arrows: [] });
    expect(await a).toEqual(await b);
  });

  it("serves a built board without asking again", async () => {
    const source = withWorker();
    const first = source.request(3);
    FakeWorker.last?.reply(3, { size: 6, arrows: [] });
    await first;

    expect(source.ready(3)).not.toBeNull();
    await source.request(3);
    expect(FakeWorker.last?.posted).toEqual([3]);
  });

  it("reports nothing ready before the worker answers", () => {
    const source = withWorker();
    source.prefetch(11);
    expect(source.ready(11)).toBeNull();
  });

  it("terminates the worker when disposed", () => {
    const source = withWorker();
    source.dispose();
    expect(FakeWorker.last?.terminated).toBe(true);
  });
});

describe("without a worker", () => {
  it("generates inline when the environment has none", async () => {
    vi.stubGlobal("Worker", undefined);
    const source = new LevelSource();

    const board = await source.request(2);
    expect(board.vehicles).toHaveLength(paramsForLevel(2).vehicles);
    expect(solve(board).status).toBe("solved");
  }, 30_000);

  it("generates inline when the worker refuses to construct", async () => {
    vi.stubGlobal("Worker", class {
      constructor() {
        throw new Error("blocked by policy");
      }
    });

    const source = new LevelSource();
    const board = await source.request(1);
    expect(board.vehicles).toHaveLength(paramsForLevel(1).vehicles);
  }, 30_000);

  it("prefetch is a no-op rather than a crash", () => {
    vi.stubGlobal("Worker", undefined);
    const source = new LevelSource();
    expect(() => source.prefetch(6)).not.toThrow();
  });

  it("falls back for everyone waiting when the worker dies", async () => {
    const source = withWorker();
    const pending = source.request(1);

    FakeWorker.last?.onerror?.(new Error("worker died"));

    // The board still arrives — generated inline — rather than hanging forever.
    const board = await pending;
    expect(board.vehicles).toHaveLength(paramsForLevel(1).vehicles);
  }, 30_000);
});
