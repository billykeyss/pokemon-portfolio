"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const ClassicPixelBackground = () => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Classic Game Boy inspired base */}
      <div
        className={`absolute inset-0 ${
          isDark ? "bg-gray-900" : "bg-[#9BBB0F]"
        }`}
      />

      {/* Pixel grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${
              isDark ? "#1f2937" : "#8b9f0f"
            } 1px, transparent 1px),
            linear-gradient(${
              isDark ? "#1f2937" : "#8b9f0f"
            } 1px, transparent 1px)
          `,
          backgroundSize: "8px 8px",
          opacity: 0.3,
        }}
      />

      {/* Moving pixel pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            repeating-conic-gradient(
              from 0deg at 50% 50%,
              ${isDark ? "#374151" : "#6b7e0f"} 0deg 90deg,
              transparent 90deg 180deg,
              ${isDark ? "#374151" : "#6b7e0f"} 180deg 270deg,
              transparent 270deg 360deg
            )
          `,
          backgroundSize: "16px 16px",
          animation: "checkerShift 12s linear infinite",
        }}
      />

      {/* Classic 8-bit blocks */}
      <div className="absolute inset-0">
        {Array.from({ length: 15 }).map((_, i) => {
          const colors = isDark
            ? ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
            : ["#1e40af", "#dc2626", "#059669", "#d97706", "#7c3aed"];

          return (
            <div
              key={i}
              className="absolute"
              style={{
                width: "12px",
                height: "12px",
                backgroundColor:
                  colors[i % colors.length] + (isDark ? "40" : "30"),
                left: `${(i * 23 + 8) % 88}%`,
                top: `${(i * 29 + 12) % 75}%`,
                animation: `pixelBounce ${3 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                imageRendering: "pixelated",
              }}
            />
          );
        })}
      </div>

      {/* Retro scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              ${isDark ? "#00000020" : "#00000010"} 2px,
              ${isDark ? "#00000020" : "#00000010"} 4px
            )
          `,
          animation: "scanlines 0.1s linear infinite",
        }}
      />

      {/* Large pixel blocks for variety */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: isDark
                ? i % 2 === 0
                  ? "#1f293740"
                  : "#0f172a40"
                : i % 2 === 0
                ? "#bef26420"
                : "#a3d96220",
              left: `${(i * 35 + 15) % 75}%`,
              top: `${(i * 41 + 25) % 60}%`,
              animation: `blockFloat ${5 + (i % 2)}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          />
        ))}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes checkerShift {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(16px, 16px);
          }
        }

        @keyframes pixelBounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-4px) scale(1.1);
            opacity: 1;
          }
        }

        @keyframes scanlines {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4px);
          }
        }

        @keyframes blockFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.5;
          }
          33% {
            transform: translateY(-6px) rotate(120deg);
            opacity: 0.8;
          }
          66% {
            transform: translateY(3px) rotate(240deg);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};
