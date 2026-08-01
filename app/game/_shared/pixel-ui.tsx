"use client";

import type { ReactNode } from "react";

export function PixelPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-4 border-[#f8f0e0] bg-[#1b1428] px-4 py-3 text-[#f8f0e0] shadow-[4px_4px_0_0_#000] ${className}`}
      style={{ imageRendering: "pixelated" }}
    >
      {children}
    </div>
  );
}

export function PixelButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-4 border-[#f8f0e0] bg-[#2f2447] px-4 py-3 font-bold uppercase tracking-wider text-[#f8f0e0] shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
