"use client";

import {
  Home,
  Code,
  BookOpen,
  User,
  Lightbulb,
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
  { id: "experiences", label: "Experience", icon: Home },
  { id: "projects", label: "Projects", icon: Code },
  { id: "skills", label: "Skills", icon: Lightbulb },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "hobbies", label: "About", icon: User },
] as const;

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
      {/* Desktop Sidebar */}
      <motion.nav
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="hidden md:flex fixed z-40 
          flex-col items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl 
          border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 shadow-2xl"
        style={{
          top: "20vh",
        }}
      >
        {navigationSections.map((section) => {
          const Icon = section.icon;
          return (
            <motion.button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`relative group flex items-center gap-3 px-4 py-3 rounded-xl 
                transition-all duration-200 ease-out font-medium text-sm
                ${
                  activeSection === section.id
                    ? "bg-blue-500 dark:bg-teal-500 text-white shadow-lg shadow-blue-500/25 dark:shadow-teal-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900`}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">{section.label}</span>

              {activeSection === section.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-blue-500 dark:bg-teal-500 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Theme Toggle in Desktop Sidebar */}
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-2">
          {mounted && (
            <motion.button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl w-full
                text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ease-out font-medium text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
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
                  <Sun className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <Moon className="w-5 h-5 flex-shrink-0" />
                )}
              </motion.div>
              <span className="whitespace-nowrap">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </motion.button>
          )}
        </div>
      </motion.nav>

      {/* Mobile Top Bar */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="md:hidden fixed top-0 left-0 right-0 z-50 
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
          border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Yichen Huang
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
        className="md:hidden fixed top-20 left-0 right-0 z-40 
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
      <div className="md:hidden h-32" />
    </>
  );
};
