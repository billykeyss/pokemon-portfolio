"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-6 right-6 md:top-8 md:right-8 z-50 group
        relative overflow-hidden rounded-2xl p-3 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border border-gray-200/50 dark:border-gray-700/50 
        shadow-lg shadow-black/5 dark:shadow-black/20
        hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 
        focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 
        dark:from-teal-900/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 
        transition-opacity duration-300"
      />

      <div className="relative flex items-center justify-center">
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-yellow-500 drop-shadow-sm" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 drop-shadow-sm" />
          )}
        </motion.div>
      </div>

      {/* Hover indicator */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 dark:border-teal-500/30 
          opacity-0 group-focus-visible:opacity-100"
        initial={false}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.button>
  );
};
