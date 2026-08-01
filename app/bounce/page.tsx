"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The arcade hub moved to /game. Static export rules out a server redirect, so
 * this replaces the history entry client-side and still renders a usable link
 * for the no-JS case.
 */
export default function BounceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/game");
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0d0a15] p-6 text-[#f8f0e0]">
      <p className="text-xs uppercase tracking-widest opacity-60">
        The arcade moved
      </p>
      <Link
        href="/game"
        className="border-4 border-[#f8f0e0] px-4 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000]"
      >
        Go to /game
      </Link>
    </main>
  );
}
