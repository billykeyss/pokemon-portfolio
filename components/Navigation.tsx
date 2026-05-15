"use client";

import {
  Home,
  Code,
  BookOpen,
  User,
  Heart,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

type NavigationProps = {
  activeSection: string;
  setActiveSection: (id: string) => void;
};

export const navigationSections = [
  { id: "about", label: "About", icon: User },
  { id: "experiences", label: "Experience", icon: Home },
  { id: "projects", label: "Projects", icon: Code },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "hobbies", label: "Hobbies", icon: Heart },
] as const;

// Short labels for cartridge tabs (cartridges are narrow)
const SHORT_LABELS = {
  about: "ABT",
  experiences: "EXP",
  projects: "PRJ",
  education: "EDU",
  hobbies: "HBY",
} as const;

// Each section gets a distinct Game Boy cartridge color (evocative of Red/Blue/Yellow/Green/Crystal)
const CARTRIDGE_COLORS = {
  about: {
    bg: "bg-red-200 dark:bg-red-900/40",
    border: "border-red-400 dark:border-red-700",
    text: "text-red-900 dark:text-red-200",
    activeBg: "bg-red-500 dark:bg-red-600",
    activeBorder: "border-red-700 dark:border-red-400",
    activeText: "text-white",
    labelBg: "bg-red-100/70 dark:bg-red-950/50",
    focusRing: "focus:ring-red-400",
  },
  experiences: {
    bg: "bg-blue-200 dark:bg-blue-900/40",
    border: "border-blue-400 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-200",
    activeBg: "bg-blue-500 dark:bg-blue-600",
    activeBorder: "border-blue-700 dark:border-blue-400",
    activeText: "text-white",
    labelBg: "bg-blue-100/70 dark:bg-blue-950/50",
    focusRing: "focus:ring-blue-400",
  },
  projects: {
    bg: "bg-yellow-200 dark:bg-yellow-900/40",
    border: "border-yellow-500 dark:border-yellow-700",
    text: "text-yellow-900 dark:text-yellow-200",
    activeBg: "bg-yellow-400 dark:bg-yellow-500",
    activeBorder: "border-yellow-600 dark:border-yellow-300",
    activeText: "text-yellow-950",
    labelBg: "bg-yellow-100/70 dark:bg-yellow-950/50",
    focusRing: "focus:ring-yellow-400",
  },
  education: {
    bg: "bg-green-200 dark:bg-green-900/40",
    border: "border-green-500 dark:border-green-700",
    text: "text-green-900 dark:text-green-200",
    activeBg: "bg-green-500 dark:bg-green-600",
    activeBorder: "border-green-700 dark:border-green-400",
    activeText: "text-white",
    labelBg: "bg-green-100/70 dark:bg-green-950/50",
    focusRing: "focus:ring-green-400",
  },
  hobbies: {
    bg: "bg-purple-200 dark:bg-purple-900/40",
    border: "border-purple-400 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-200",
    activeBg: "bg-purple-500 dark:bg-purple-600",
    activeBorder: "border-purple-700 dark:border-purple-400",
    activeText: "text-white",
    labelBg: "bg-purple-100/70 dark:bg-purple-950/50",
    focusRing: "focus:ring-purple-400",
  },
  default: {
    bg: "bg-gray-200 dark:bg-gray-700",
    border: "border-gray-400 dark:border-gray-600",
    text: "text-gray-700 dark:text-gray-200",
    activeBg: "bg-gray-500 dark:bg-gray-600",
    activeBorder: "border-gray-700 dark:border-gray-400",
    activeText: "text-white",
    labelBg: "bg-gray-100/70 dark:bg-gray-950/50",
    focusRing: "focus:ring-gray-400",
  },
} as const;

export type NavigationSection = (typeof navigationSections)[number]["id"];

export const Navigation = ({
  activeSection,
  setActiveSection,
}: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* Desktop: Cartridge Tabs — each menu item is a Game Boy cartridge that "slots into" the Gameboy below */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="hidden lg:flex w-full flex-row items-end gap-1 -mb-2 z-10 relative"
      >
        {navigationSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const cart =
            CARTRIDGE_COLORS[section.id as keyof typeof CARTRIDGE_COLORS] ||
            CARTRIDGE_COLORS.default;
          const shortLabel =
            SHORT_LABELS[section.id as keyof typeof SHORT_LABELS] ||
            section.label.slice(0, 3).toUpperCase();

          return (
            <motion.button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 px-1 rounded-t-lg border-2 border-b-0 transition-all duration-150 relative font-bold
                ${
                  isActive
                    ? `${cart.activeBg} ${cart.activeBorder} ${cart.activeText} shadow-md z-20 translate-y-1`
                    : `${cart.bg} ${cart.border} ${cart.text} opacity-70 hover:opacity-100 hover:-translate-y-0.5`
                }
                focus:outline-none focus:ring-2 focus:ring-offset-1 ${cart.focusRing}`}
              whileTap={{ scale: 0.96 }}
              title={section.label}
            >
              {/* Cartridge top "grip" notch */}
              <div
                className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-t-sm ${isActive ? cart.activeBg : cart.bg} ${isActive ? cart.activeBorder : cart.border} border-2 border-b-0`}
              />
              {/* Label sticker */}
              <div
                className={`w-full ${cart.labelBg} border-y border-black/30 dark:border-white/20 py-1 -mx-1 px-1 flex flex-col items-center gap-0.5 shadow-inner`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[8px] tracking-widest leading-none">
                  {shortLabel}
                </span>
              </div>
            </motion.button>
          );
        })}

        {/* Theme toggle as a small "power switch" cartridge */}
        {mounted && (
          <motion.button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center gap-0.5 pt-2 pb-3 px-2 rounded-t-lg border-2 border-b-0 border-gray-500 dark:border-gray-400 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 opacity-70 hover:opacity-100 hover:-translate-y-0.5 transition-all relative"
            whileTap={{ scale: 0.96 }}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title="Toggle theme"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-t-sm bg-gray-200 dark:bg-gray-700 border-2 border-b-0 border-gray-500 dark:border-gray-400" />
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.div>
            <span className="text-[8px] tracking-widest leading-none">PWR</span>
          </motion.button>
        )}
      </motion.nav>

      {/* Mobile Top Bar */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="lg:hidden fixed top-0 left-0 right-0 z-50 
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
          border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Bill Huang
          </h1>

          <div className="flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            {mounted && (
              <motion.button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-400 
                  hover:text-gray-900 dark:hover:text-gray-100 
                  hover:bg-gray-100 dark:hover:bg-gray-800 
                  transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </motion.div>
              </motion.button>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-400 
                hover:text-gray-900 dark:hover:text-gray-100 
                hover:bg-gray-100 dark:hover:bg-gray-800 
                transition-colors duration-200"
              aria-label="Toggle navigation"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-gray-200/50 dark:border-gray-700/50 
                bg-white/95 dark:bg-gray-900/95"
            >
              <div className="px-6 py-4 space-y-2">
                {navigationSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <motion.button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                        transition-all duration-200 ease-out font-medium text-sm text-left
                        ${
                          activeSection === section.id
                            ? "bg-blue-500 dark:bg-teal-500 text-white"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{section.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile Tab Navigation - Always Visible */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
        className="lg:hidden fixed top-20 left-0 right-0 z-40 
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
          border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex px-4 py-3 gap-2 min-w-max">
            {navigationSections.map((section) => {
              const Icon = section.icon;
              return (
                <motion.button
                  key={`mobile-tab-${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg 
                    transition-all duration-200 ease-out font-medium text-xs whitespace-nowrap
                    ${
                      activeSection === section.id
                        ? "bg-blue-500 dark:bg-teal-500 text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 focus:ring-offset-1`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{section.label}</span>

                  {activeSection === section.id && (
                    <motion.div
                      layoutId="mobileActiveIndicator"
                      className="absolute inset-0 bg-blue-500 dark:bg-teal-500 rounded-lg -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Updated Mobile spacer to account for both bars */}
      <div className="lg:hidden h-32" />
    </>
  );
};
