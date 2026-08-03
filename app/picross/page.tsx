"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LevelSelect } from "@/app/game/_shared/LevelSelect";
import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { levelCount, puzzleForLevel } from "./engine/level";
import {
  decodeBoard,
  defaultPicrossSave,
  encodeBoard,
  loadPicrossSave,
  writePicrossSave,
  type PicrossSave,
} from "./engine/save";
import { BLANK, FILLED, UNKNOWN, type Board, type Puzzle } from "./engine/types";
import { drawScene, REFUSE_DURATION, type DrawState } from "./render/draw";
import { cellAt, layoutPuzzle } from "./render/layout";

const FIXED_DT = 1 / 60;
const REVEAL_SECONDS = 0.9;

type Mode = "fill" | "mark";

/** Has every cell of the picture been shaded? Marks are irrelevant. */
function isComplete(board: Board, puzzle: Puzzle): boolean {
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i] === FILLED && board[i] !== FILLED) return false;
  }
  return true;
}

export default function PicrossPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [save, setSave] = useState<PicrossSave>(defaultPicrossSave);
  const [loaded, setLoaded] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => puzzleForLevel(1));
  // Deliberately empty until mount; see the note above about SSR.
  const [board, setBoard] = useState<Board>(() => new Uint8Array(0));
  const [mode, setMode] = useState<Mode>("fill");
  const [misses, setMisses] = useState(0);
  const [won, setWon] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  const boardRef = useRef(board);
  boardRef.current = board;
  const puzzleRef = useRef(puzzle);
  puzzleRef.current = puzzle;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const loadedRef = useRef(false);
  const wonRef = useRef(false);
  wonRef.current = won;

  const revealRef = useRef(0);
  const refusedRef = useRef<{ row: number; col: number; t: number } | null>(null);
  const paintingRef = useRef<number | null>(null);
  /**
   * The cell painted most recently in this stroke.
   *
   * A pointermove arrives for the same cell the pointerdown just handled, and a
   * refusal leaves no board change behind for the `!== UNKNOWN` guard to catch,
   * so without this a single refused tap counted as two misses.
   */
  const lastCellRef = useRef<number | null>(null);
  /** Canvas-space position of the previous pointer sample, for interpolation. */
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const install = useCallback((level: number, restored: Board | null) => {
    const next = puzzleForLevel(level);
    const fresh = restored ?? new Uint8Array(next.size * next.size);

    // Refs first: the win check reads them, and a frame landing between here
    // and the re-render would otherwise judge the new level by the old board.
    puzzleRef.current = next;
    boardRef.current = fresh;
    revealRef.current = 0;
    refusedRef.current = null;

    setPuzzle(next);
    setBoard(fresh);
    setWon(false);
  }, []);

  useEffect(() => {
    const restored = loadPicrossSave(window.localStorage);
    const level = Math.min(levelCount(), restored.level);
    const size = puzzleForLevel(level).size;

    const saved =
      restored.progress !== null && restored.progress.level === level
        ? decodeBoard(restored.progress.cells, size)
        : null;

    install(level, saved);
    loadedRef.current = true;

    setSave(restored);
    setLoaded(true);
  }, [install]);

  useEffect(() => {
    if (!loaded) return;
    writePicrossSave(window.localStorage, save);
  }, [save, loaded]);

  // Persist partial work. A 15x15 is ten minutes; a refresh must not cost it.
  useEffect(() => {
    if (!loaded || won || board.length === 0) return;
    setSave((s) => ({
      ...s,
      progress: { level: s.level, cells: encodeBoard(board) },
    }));
  }, [board, loaded, won]);

  const loadLevel = useCallback(
    (level: number) => {
      const clamped = Math.min(levelCount(), Math.max(1, level));
      install(clamped, null);
      setMisses(0);
      setSave((s) => ({
        ...s,
        level: clamped,
        best: Math.max(s.best, clamped),
        progress: null,
      }));
    },
    [install],
  );

  const paint = useCallback((row: number, col: number) => {
    const current = boardRef.current;
    const active = puzzleRef.current;
    const index = row * active.size + col;

    // An immediate repeat of the last cell touched in this stroke is a
    // resampled pointer event, not a new visit — skip it so a refusal isn't
    // double-counted. A later, distinct revisit of the same cell (crossed,
    // left, then crossed again) is not caught here, by design.
    if (lastCellRef.current === index) return;
    lastCellRef.current = index;

    if (current[index] !== UNKNOWN) return;

    if (modeRef.current === "mark") {
      const next = Uint8Array.from(current);
      next[index] = BLANK;
      boardRef.current = next;
      setBoard(next);
      return;
    }

    if (active.solution[index] !== FILLED) {
      // Refused rather than punished: guessing is pointless because every
      // puzzle is solvable without it, so a wrong fill is a misread, not a sin.
      refusedRef.current = { row, col, t: 0 };
      setMisses((m) => m + 1);
      return;
    }

    const next = Uint8Array.from(current);
    next[index] = FILLED;
    boardRef.current = next;
    setBoard(next);
  }, []);

  /** Canvas-space (not client-space) position of a pointer event. */
  const pointFrom = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }, []);

  const currentLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    return layoutPuzzle(puzzleRef.current, canvas.width, canvas.height);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (wonRef.current || showLevels) return;
      const point = pointFrom(event);
      const layout = currentLayout();
      if (point === null || layout === null) return;

      const cell = cellAt(layout, point.x, point.y);
      if (cell === null) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      paintingRef.current = event.pointerId;
      lastPointRef.current = point;
      // Null, not carried over: a fresh tap landing on the same cell a prior
      // stroke ended on must still register as a new visit.
      lastCellRef.current = null;
      paint(cell.row, cell.col);
    },
    [paint, pointFrom, currentLayout, showLevels],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (paintingRef.current !== event.pointerId) return;
      const point = pointFrom(event);
      const layout = currentLayout();
      if (point === null || layout === null) return;

      const from = lastPointRef.current ?? point;
      const dx = point.x - from.x;
      const dy = point.y - from.y;
      const distance = Math.hypot(dx, dy);

      // Pointer events are sampled, not continuous: a fast drag can jump
      // several cells between two samples. Walking the path in thirds of a
      // cell and painting every cell crossed keeps a quick swipe from
      // skipping cells it visibly passed over.
      const step = Math.max(1, layout.cell / 3);
      const steps = Math.max(1, Math.ceil(distance / step));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const cell = cellAt(layout, from.x + dx * t, from.y + dy * t);
        if (cell !== null) paint(cell.row, cell.col);
      }

      lastPointRef.current = point;
    },
    [paint, pointFrom, currentLayout],
  );

  const endStroke = useCallback(() => {
    paintingRef.current = null;
    lastCellRef.current = null;
    lastPointRef.current = null;
  }, []);

  const step = useCallback(() => {
    const refused = refusedRef.current;
    if (refused !== null) {
      const t = refused.t + FIXED_DT;
      refusedRef.current = t >= REFUSE_DURATION ? null : { ...refused, t };
    }

    if (wonRef.current && revealRef.current < 1) {
      revealRef.current = Math.min(1, revealRef.current + FIXED_DT / REVEAL_SECONDS);
    }

    // Standing condition, not the instant a cell was filled: the board arrives
    // through a state update read here via a ref, so an edge check can miss it.
    if (loadedRef.current && !wonRef.current && boardRef.current.length > 0) {
      if (isComplete(boardRef.current, puzzleRef.current)) setWon(true);
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    if (boardRef.current.length === 0) return;

    const layout = layoutPuzzle(puzzleRef.current, canvas.width, canvas.height);
    const state: DrawState = {
      puzzle: puzzleRef.current,
      board: boardRef.current,
      reveal: revealRef.current,
      refused: refusedRef.current,
    };

    drawScene(ctx, layout, state, canvas.width, canvas.height);
  }, []);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Record the clear, keeping the fewest misses.
  useEffect(() => {
    if (!won) return;
    setSave((s) => ({
      ...s,
      cleared: s.cleared.includes(s.level) ? s.cleared : [...s.cleared, s.level],
      progress: null,
    }));
  }, [won]);

  const atEnd = save.level >= levelCount();

  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-5 text-[#f8f0e0]">
      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/game" className="text-[10px] uppercase tracking-widest opacity-60">
            &larr; Arcade
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">Picross</h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            {misses === 0 ? "clean" : `${misses} miss`}
          </span>
        </div>

        <PixelPanel className="!p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            className="block aspect-square w-full touch-none select-none"
          />
        </PixelPanel>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="underline decoration-dotted underline-offset-4"
            >
              Level {save.level}
            </button>
            <span className="opacity-60">{puzzle.size}&times;{puzzle.size}</span>
            <span className="opacity-60">of {levelCount()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PixelButton
              onClick={() => setMode("fill")}
              className={`!px-1 !py-2 text-[10px] ${mode === "fill" ? "" : "opacity-50"}`}
            >
              Fill
            </PixelButton>
            <PixelButton
              onClick={() => setMode("mark")}
              className={`!px-1 !py-2 text-[10px] ${mode === "mark" ? "" : "opacity-50"}`}
            >
              Mark
            </PixelButton>
          </div>

          <PixelButton
            onClick={() => loadLevel(save.level)}
            className="w-full !px-1 !py-2 text-[10px]"
          >
            Reset
          </PixelButton>

          <p className="text-center text-[10px] uppercase tracking-widest opacity-40">
            {mode === "fill" ? "Drag to shade cells" : "Drag to mark blanks"}
          </p>
        </div>

        {showLevels && (
          <LevelSelect
            best={Math.min(levelCount(), save.best)}
            current={save.level}
            scoreByLevel={{}}
            scoreLabel="cleared"
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}

        {won && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <PixelPanel className="w-full max-w-xs text-center">
              <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
                {puzzle.name}
              </h2>
              <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
                {misses === 0 ? "clean run" : `${misses} miss${misses === 1 ? "" : "es"}`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  onClick={() => loadLevel(save.level)}
                  className="!px-2 !py-2 text-[10px]"
                >
                  Replay
                </PixelButton>
                <PixelButton
                  onClick={() => loadLevel(save.level + 1)}
                  disabled={atEnd}
                  className="!px-2 !py-2 text-[10px]"
                >
                  {atEnd ? "All done" : "Next"}
                </PixelButton>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
