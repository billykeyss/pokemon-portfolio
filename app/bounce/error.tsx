"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ArcadeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[arcade]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0d0a15] p-6 text-[#f8f0e0]">
      <h1 className="text-lg font-bold uppercase tracking-widest">Cabinet jammed</h1>
      <p className="max-w-xs text-center text-xs uppercase tracking-wider opacity-60">
        Something broke. Your Dex is safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="border-4 border-[#f8f0e0] px-4 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000]"
      >
        Try again
      </button>
      <Link
        href="/game"
        className="text-xs uppercase tracking-widest underline opacity-70"
      >
        Back to arcade
      </Link>
    </main>
  );
}
