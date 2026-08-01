"use client";

import { useEffect, useRef, useState } from "react";
import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { CritterIcon } from "./CritterIcon";

export interface Choice {
  id: string;
  name: string;
  description: string;
  /** Critter id, when the choice is an evolution branch. */
  critterId?: string;
}

/**
 * Presents 2-3 choices. When `autoPickAfterMs` is set (auto mode), an
 * unanswered choice resolves itself so lean-back play is never interrupted.
 *
 * The deadline and callbacks live in refs on purpose: callers build `choices`
 * inline, so a dependency on them would restart the countdown on every render
 * and the auto-pick would never fire.
 */
export function ChoiceModal({
  title,
  choices,
  onChoose,
  autoPickAfterMs,
}: {
  title: string;
  choices: Choice[];
  onChoose: (id: string) => void;
  autoPickAfterMs: number | null;
}) {
  const [remaining, setRemaining] = useState(autoPickAfterMs);

  const choicesRef = useRef(choices);
  const onChooseRef = useRef(onChoose);
  useEffect(() => {
    choicesRef.current = choices;
    onChooseRef.current = onChoose;
  });

  useEffect(() => {
    if (autoPickAfterMs === null) return;

    const deadline = performance.now() + autoPickAfterMs;
    let frame = 0;
    let done = false;

    const tick = () => {
      if (done) return;
      const left = deadline - performance.now();
      if (left <= 0) {
        done = true;
        const first = choicesRef.current[0];
        if (first) onChooseRef.current(first.id);
        return;
      }
      setRemaining(left);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      done = true;
      cancelAnimationFrame(frame);
    };
  }, [autoPickAfterMs]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <PixelPanel className="w-full max-w-sm">
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest">
          {title}
        </h2>
        <div className="flex flex-col gap-2">
          {choices.map((c) => (
            <PixelButton
              key={c.id}
              onClick={() => onChoose(c.id)}
              className="text-left"
            >
              <span className="flex items-center gap-2">
                {c.critterId && <CritterIcon id={c.critterId} size={24} />}
                <span className="text-sm">{c.name}</span>
              </span>
              <span className="mt-1 block text-xs font-normal normal-case opacity-70">
                {c.description}
              </span>
            </PixelButton>
          ))}
        </div>
        {remaining !== null && (
          <p className="mt-3 text-center text-xs uppercase tracking-wider opacity-50">
            Auto-picking in {Math.ceil(remaining / 1000)}s
          </p>
        )}
      </PixelPanel>
    </div>
  );
}
