"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const EightBitBackground = () => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base 8-bit grid pattern */}
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900"
            : "bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100"
        }`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, ${
              isDark ? "#1e293b40" : "#fbbf2420"
            } 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, ${
              isDark ? "#33415530" : "#f59e0b20"
            } 0%, transparent 50%)
          `,
        }}
      />

      {/* Animated pixelated overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${
              isDark ? "#64748b20" : "#92400e20"
            } 50%, transparent 50%),
            linear-gradient(${
              isDark ? "#64748b20" : "#92400e20"
            } 50%, transparent 50%)
          `,
          backgroundSize: "16px 16px",
          animation: "pixelShift 8s linear infinite",
        }}
      />

      {/* Pokemon-inspired floating pixels */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 ${
              isDark
                ? i % 4 === 0
                  ? "bg-blue-400/30"
                  : i % 4 === 1
                  ? "bg-green-400/30"
                  : i % 4 === 2
                  ? "bg-red-400/30"
                  : "bg-yellow-400/30"
                : i % 4 === 0
                ? "bg-blue-600/20"
                : i % 4 === 1
                ? "bg-green-600/20"
                : i % 4 === 2
                ? "bg-red-600/20"
                : "bg-yellow-600/20"
            }`}
            style={{
              left: `${(i * 17 + 10) % 90}%`,
              top: `${(i * 23 + 15) % 85}%`,
              animation: `pixelFloat ${6 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Larger 8-bit blocks */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 ${
              isDark
                ? i % 3 === 0
                  ? "bg-purple-500/20"
                  : i % 3 === 1
                  ? "bg-indigo-500/20"
                  : "bg-teal-500/20"
                : i % 3 === 0
                ? "bg-purple-600/15"
                : i % 3 === 1
                ? "bg-indigo-600/15"
                : "bg-teal-600/15"
            }`}
            style={{
              left: `${(i * 27 + 5) % 80}%`,
              top: `${(i * 31 + 20) % 70}%`,
              animation: `blockPulse ${4 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {/* Circuit-like lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="circuit"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 20 L20 20 L20 0"
              stroke={isDark ? "#475569" : "#a16207"}
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M60 60 L80 60 L80 80"
              stroke={isDark ? "#475569" : "#a16207"}
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <circle
              cx="20"
              cy="20"
              r="2"
              fill={isDark ? "#64748b" : "#92400e"}
              opacity="0.4"
            />
            <circle
              cx="60"
              cy="60"
              r="2"
              fill={isDark ? "#64748b" : "#92400e"}
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes pixelShift {
          0% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(4px, 0);
          }
          50% {
            transform: translate(4px, 4px);
          }
          75% {
            transform: translate(0, 4px);
          }
          100% {
            transform: translate(0, 0);
          }
        }

        @keyframes pixelFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.6;
          }
          33% {
            transform: translateY(-8px) rotate(120deg);
            opacity: 1;
          }
          66% {
            transform: translateY(4px) rotate(240deg);
            opacity: 0.8;
          }
        }

        @keyframes blockPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};
