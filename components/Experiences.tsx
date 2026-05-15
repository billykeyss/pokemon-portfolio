import {
  getPokemonSprite,
  getPokemonSpriteSize,
  getRandomPokemonName,
} from "@/utils/pokemon";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Clock,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { resumeData, type Experience } from "@/data/resume-data";

// Add this utility function for formatting dates
const formatDate = (dateString: string): string => {
  if (dateString === "Present") return "Present";
  // Parse in local time so e.g. "2025-10" doesn't drift to "Sep 2025" in negative UTC offsets
  const [year, month] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
};

// Add a duration display
const getDuration = (startDate: string, endDate: string): string => {
  const start = new Date(startDate + "-01");
  const end = endDate === "Present" ? new Date() : new Date(endDate + "-01");
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

// Enhanced timeline utilities
const getTimelineColors = (index: number, isSpecial: boolean = false) => {
  const colors = [
    {
      primary: "from-blue-500 to-indigo-600",
      light: "from-blue-100 to-indigo-100",
      dark: "from-blue-900/30 to-indigo-900/30",
      glow: "shadow-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
      cardBg:
        "bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20",
      cardBorder: "border-blue-200 dark:border-indigo-400/50",
      cardHover: "hover:shadow-blue-500/20 dark:hover:shadow-indigo-500/20",
      cardRing: "ring-blue-400",
      textPrimary: "text-blue-900 dark:text-indigo-300",
      textSecondary: "text-blue-800 dark:text-indigo-200",
      textTertiary: "text-blue-700 dark:text-indigo-300",
      bgAccent: "bg-blue-50 dark:bg-blue-900/30",
      buttonColors:
        "text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 focus:ring-blue-500 dark:focus:ring-indigo-400 hover:bg-blue-100 dark:hover:bg-indigo-900/30",
      detailsBg: "bg-blue-50/50 dark:bg-blue-900/20 border-blue-400",
      detailsText: "text-blue-800 dark:text-indigo-200",
      bulletColor: "bg-blue-500",
      glowOverlay: "from-blue-500/5 to-indigo-500/5",
    },
    {
      primary: "from-emerald-500 to-teal-600",
      light: "from-emerald-100 to-teal-100",
      dark: "from-emerald-900/30 to-teal-900/30",
      glow: "shadow-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      cardBg:
        "bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/20 dark:to-teal-900/20",
      cardBorder: "border-emerald-200 dark:border-teal-400/50",
      cardHover: "hover:shadow-emerald-500/20 dark:hover:shadow-teal-500/20",
      cardRing: "ring-emerald-400",
      textPrimary: "text-emerald-900 dark:text-teal-300",
      textSecondary: "text-emerald-800 dark:text-teal-200",
      textTertiary: "text-emerald-700 dark:text-teal-300",
      bgAccent: "bg-emerald-50 dark:bg-emerald-900/30",
      buttonColors:
        "text-emerald-600 dark:text-teal-400 hover:text-emerald-700 dark:hover:text-teal-300 focus:ring-emerald-500 dark:focus:ring-teal-400 hover:bg-emerald-100 dark:hover:bg-teal-900/30",
      detailsBg: "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-400",
      detailsText: "text-emerald-800 dark:text-teal-200",
      bulletColor: "bg-emerald-500",
      glowOverlay: "from-emerald-500/5 to-teal-500/5",
    },
    {
      primary: "from-purple-500 to-violet-600",
      light: "from-purple-100 to-violet-100",
      dark: "from-purple-900/30 to-violet-900/30",
      glow: "shadow-purple-500/30",
      text: "text-purple-600 dark:text-purple-400",
      cardBg:
        "bg-gradient-to-br from-purple-50/80 to-violet-50/80 dark:from-purple-900/20 dark:to-violet-900/20",
      cardBorder: "border-purple-200 dark:border-violet-400/50",
      cardHover: "hover:shadow-purple-500/20 dark:hover:shadow-violet-500/20",
      cardRing: "ring-purple-400",
      textPrimary: "text-purple-900 dark:text-violet-300",
      textSecondary: "text-purple-800 dark:text-violet-200",
      textTertiary: "text-purple-700 dark:text-violet-300",
      bgAccent: "bg-purple-50 dark:bg-purple-900/30",
      buttonColors:
        "text-purple-600 dark:text-violet-400 hover:text-purple-700 dark:hover:text-violet-300 focus:ring-purple-500 dark:focus:ring-violet-400 hover:bg-purple-100 dark:hover:bg-violet-900/30",
      detailsBg: "bg-purple-50/50 dark:bg-purple-900/20 border-purple-400",
      detailsText: "text-purple-800 dark:text-violet-200",
      bulletColor: "bg-purple-500",
      glowOverlay: "from-purple-500/5 to-violet-500/5",
    },
    {
      primary: "from-rose-500 to-pink-600",
      light: "from-rose-100 to-pink-100",
      dark: "from-rose-900/30 to-pink-900/30",
      glow: "shadow-rose-500/30",
      text: "text-rose-600 dark:text-rose-400",
      cardBg:
        "bg-gradient-to-br from-rose-50/80 to-pink-50/80 dark:from-rose-900/20 dark:to-pink-900/20",
      cardBorder: "border-rose-200 dark:border-pink-400/50",
      cardHover: "hover:shadow-rose-500/20 dark:hover:shadow-pink-500/20",
      cardRing: "ring-rose-400",
      textPrimary: "text-rose-900 dark:text-pink-300",
      textSecondary: "text-rose-800 dark:text-pink-200",
      textTertiary: "text-rose-700 dark:text-pink-300",
      bgAccent: "bg-rose-50 dark:bg-rose-900/30",
      buttonColors:
        "text-rose-600 dark:text-pink-400 hover:text-rose-700 dark:hover:text-pink-300 focus:ring-rose-500 dark:focus:ring-pink-400 hover:bg-rose-100 dark:hover:bg-pink-900/30",
      detailsBg: "bg-rose-50/50 dark:bg-rose-900/20 border-rose-400",
      detailsText: "text-rose-800 dark:text-pink-200",
      bulletColor: "bg-rose-500",
      glowOverlay: "from-rose-500/5 to-pink-500/5",
    },
    {
      primary: "from-amber-500 to-orange-600",
      light: "from-amber-100 to-orange-100",
      dark: "from-amber-900/30 to-orange-900/30",
      glow: "shadow-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      cardBg:
        "bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20",
      cardBorder: "border-amber-200 dark:border-orange-400/50",
      cardHover: "hover:shadow-amber-500/20 dark:hover:shadow-orange-500/20",
      cardRing: "ring-amber-400",
      textPrimary: "text-amber-900 dark:text-orange-300",
      textSecondary: "text-amber-800 dark:text-orange-200",
      textTertiary: "text-amber-700 dark:text-orange-300",
      bgAccent: "bg-amber-50 dark:bg-amber-900/30",
      buttonColors:
        "text-amber-600 dark:text-orange-400 hover:text-amber-700 dark:hover:text-orange-300 focus:ring-amber-500 dark:focus:ring-orange-400 hover:bg-amber-100 dark:hover:bg-orange-900/30",
      detailsBg: "bg-amber-50/50 dark:bg-amber-900/20 border-amber-400",
      detailsText: "text-amber-800 dark:text-orange-200",
      bulletColor: "bg-amber-500",
      glowOverlay: "from-amber-500/5 to-orange-500/5",
    },
    {
      primary: "from-cyan-500 to-blue-600",
      light: "from-cyan-100 to-blue-100",
      dark: "from-cyan-900/30 to-blue-900/30",
      glow: "shadow-cyan-500/30",
      text: "text-cyan-600 dark:text-cyan-400",
      cardBg:
        "bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-900/20 dark:to-blue-900/20",
      cardBorder: "border-cyan-200 dark:border-blue-400/50",
      cardHover: "hover:shadow-cyan-500/20 dark:hover:shadow-blue-500/20",
      cardRing: "ring-cyan-400",
      textPrimary: "text-cyan-900 dark:text-blue-300",
      textSecondary: "text-cyan-800 dark:text-blue-200",
      textTertiary: "text-cyan-700 dark:text-blue-300",
      bgAccent: "bg-cyan-50 dark:bg-cyan-900/30",
      buttonColors:
        "text-cyan-600 dark:text-blue-400 hover:text-cyan-700 dark:hover:text-blue-300 focus:ring-cyan-500 dark:focus:ring-blue-400 hover:bg-cyan-100 dark:hover:bg-blue-900/30",
      detailsBg: "bg-cyan-50/50 dark:bg-cyan-900/20 border-cyan-400",
      detailsText: "text-cyan-800 dark:text-blue-200",
      bulletColor: "bg-cyan-500",
      glowOverlay: "from-cyan-500/5 to-blue-500/5",
    },
  ];

  if (isSpecial) {
    return {
      primary: "from-gradient-to-r from-blue-600 via-purple-600 to-teal-600",
      light: "from-blue-50 via-purple-50 to-teal-50",
      dark: "from-blue-900/20 via-purple-900/20 to-teal-900/20",
      glow: "shadow-blue-500/40",
      text: "text-blue-600 dark:text-teal-400",
      cardBg:
        "bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-teal-50/80 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-teal-900/20",
      cardBorder: "border-blue-200 dark:border-teal-400/50",
      cardHover: "hover:shadow-blue-500/20 dark:hover:shadow-teal-500/20",
      cardRing: "ring-blue-400",
      textPrimary: "text-blue-900 dark:text-teal-300",
      textSecondary: "text-blue-800 dark:text-teal-200",
      textTertiary: "text-blue-700 dark:text-teal-300",
      bgAccent: "bg-blue-50 dark:bg-blue-900/30",
      buttonColors:
        "text-blue-600 dark:text-teal-400 hover:text-blue-700 dark:hover:text-teal-300 focus:ring-blue-500 dark:focus:ring-teal-400 hover:bg-blue-100 dark:hover:bg-teal-900/30",
      detailsBg: "bg-blue-50/50 dark:bg-blue-900/20 border-blue-400",
      detailsText: "text-blue-800 dark:text-teal-200",
      bulletColor: "bg-blue-500",
      glowOverlay: "from-blue-500/5 via-purple-500/5 to-teal-500/5",
    };
  }

  return colors[index % colors.length];
};

const getTimelinePosition = (
  date: string,
  startYear: number = 2015,
): number => {
  const now = new Date();
  const targetDate = date === "Present" ? now : new Date(date + "-01");
  const yearDiff = targetDate.getFullYear() - startYear;
  const monthDiff = targetDate.getMonth();
  const dateMonths = yearDiff * 12 + monthDiff;

  // Reversed: older dates (2015) at bottom, newer dates (present) at top
  // Increased spacing: 16px per month for better visual spacing
  return dateMonths * 16;
};

export const Experiences = () => {
  const [expandedExperience, setExpandedExperience] = useState<number | null>(
    null,
  );
  const [experiencePokemons, setExperiencePokemons] = useState<string[]>([]);
  const [hoveredExperience, setHoveredExperience] = useState<number | null>(
    null,
  );

  const experiences: Experience[] = resumeData.experiences;

  // Greedy lane assignment so overlapping roles cluster without leaving lanes empty
  const laneAssignments: number[] = (() => {
    const now = Date.now();
    const indexed = experiences.map((e, i) => ({
      i,
      startMs: new Date(e.startDate + "-01").getTime(),
      endMs:
        e.endDate === "Present" ? now : new Date(e.endDate + "-01").getTime(),
    }));
    const sorted = [...indexed].sort((a, b) => a.startMs - b.startMs);
    const laneEndMs: number[] = [];
    const lanes = new Array<number>(experiences.length);
    for (const e of sorted) {
      let placed = false;
      for (let l = 0; l < laneEndMs.length; l++) {
        if (laneEndMs[l] <= e.startMs) {
          laneEndMs[l] = e.endMs;
          lanes[e.i] = l;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes[e.i] = laneEndMs.length;
        laneEndMs.push(e.endMs);
      }
    }
    return lanes;
  })();

  useEffect(() => {
    const pokemons = experiences.map(() => getRandomPokemonName());
    setExperiencePokemons(pokemons);
  }, []);

  const startYear = 2015;
  const currentYear = new Date().getFullYear();
  const yearRange = currentYear - startYear + 1;

  // Calculate the total height needed to span all experience cards
  const calculateTimelineHeight = () => {
    // Get the maximum timeline position (current year/present)
    const maxTimelinePosition = getTimelinePosition("Present", startYear);
    // Estimate: each experience card is roughly 200px + spacing
    const estimatedCardHeight = 220; // including margin
    const totalCardsHeight = experiences.length * estimatedCardHeight;

    // Use the larger of the two to ensure timeline spans the full content
    return Math.max(totalCardsHeight, maxTimelinePosition + 500); // Small bottom padding only
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Enhanced Timeline - visible on medium screens and up */}
      <div className="hidden lg:block">
        {/* Modern Year Markers - Now positioned from bottom to top */}
        <div className="absolute -left-36 top-0">
          {Array.from({ length: yearRange }).map((_, i) => {
            const year = startYear + i; // Changed: start from 2015 and go up
            const maxPosition = getTimelinePosition("Present", startYear);
            const yearPosition = getTimelinePosition(`${year}-01`, startYear);
            const timelineHeight = calculateTimelineHeight();

            // Position from the bottom: 2015 at bottom, current year at top
            const position =
              timelineHeight -
              (yearPosition / maxPosition) * (timelineHeight - 100) -
              50;
            const isCurrentYear = year === currentYear;

            return (
              <motion.div
                key={`year-${year}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`absolute flex items-center justify-center transition-all duration-300 ${
                  isCurrentYear
                    ? "text-blue-600 dark:text-blue-400 font-bold text-base"
                    : "text-gray-400 dark:text-gray-500 text-sm hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                style={{ top: `${position}px` }}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>{year}</span>
                </div>
                {isCurrentYear && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Main Timeline Spine - Extended Height */}
        <div
          className="absolute left-0 top-0 w-1 bg-gradient-to-t from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 shadow-lg rounded-full"
          style={{ height: `${calculateTimelineHeight()}px` }}
        >
          {/* Timeline Segments for Each Experience */}
          {experiences.map((exp, index) => {
            const maxPosition = getTimelinePosition("Present", startYear);
            const startPosition = getTimelinePosition(exp.startDate, startYear);
            const endPosition = getTimelinePosition(exp.endDate, startYear);
            const timelineHeight = calculateTimelineHeight();

            // Calculate positions using the full timeline height
            const startY =
              timelineHeight -
              (startPosition / maxPosition) * (timelineHeight - 100) -
              50;
            const endY =
              timelineHeight -
              (endPosition / maxPosition) * (timelineHeight - 100) -
              50;
            const height = Math.abs(startY - endY);
            const topPosition = Math.min(startY, endY);

            const colors = getTimelineColors(index, false);
            const isHovered = hoveredExperience === index;

            // Splay lanes symmetrically around the spine: lane 0 sits on the line, lane 1 to its left, lane 2 to its right, etc.
            const layerOffset = laneAssignments[index] ?? 0;
            const splayStep =
              layerOffset === 0
                ? 0
                : layerOffset % 2 === 1
                  ? -Math.ceil(layerOffset / 2)
                  : Math.ceil(layerOffset / 2);
            // spine is at x=0 with width 4 (center=2); bar is 20px wide so half=10
            const offsetX = 2 - 10 + splayStep * 24;

            return (
              <motion.div
                key={`timeline-segment-${index}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{
                  scaleY: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: index * 0.2,
                  duration: 0.6,
                  type: "spring",
                  stiffness: 100,
                }}
                className={`absolute rounded-lg overflow-visible cursor-pointer group/timeline transition-all duration-200 ${
                  isHovered ? "z-10" : "z-0"
                }`}
                style={{
                  top: `${topPosition}px`,
                  height: `${Math.max(height, 32)}px`, // Minimum height increased
                  left: `${offsetX}px`,
                  width: "20px",
                  transformOrigin: "bottom",
                }}
                onMouseEnter={() => setHoveredExperience(index)}
                onMouseLeave={() => setHoveredExperience(null)}
              >
                {/* Cartridge body — beveled top/bottom corners via clip-path */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${
                    colors.primary
                  } shadow-md transition-opacity duration-200 ${
                    isHovered ? "opacity-100" : "opacity-95"
                  }`}
                  style={{
                    clipPath:
                      "polygon(0 8px, 30% 0, 70% 0, 100% 8px, 100% calc(100% - 6px), 80% 100%, 20% 100%, 0 calc(100% - 6px))",
                  }}
                />

                {/* Inner bevel — top highlight to bottom shadow for depth */}
                <div
                  className="absolute inset-x-1 top-2 bottom-2 rounded-sm pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.28) 100%)",
                  }}
                />

                {/* Outer glow — soft halo behind the cartridge */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-b ${
                    colors.primary
                  } ${colors.glow} blur-md -z-10 transition-opacity duration-200 ${
                    isHovered ? "opacity-50" : "opacity-25"
                  }`}
                />

                {/* Pokéball cap at top.
                    Centering lives on the wrapper so framer-motion's transform
                    (used for the entry scale) doesn't clobber translateX(-50%). */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.3 }}
                    className={`relative w-5 h-5 rounded-full overflow-hidden border-2 border-black shadow-lg ${
                      exp.endDate === "Present" ? "animate-pulse" : ""
                    }`}
                  >
                    <div
                      className={`h-1/2 bg-gradient-to-br ${colors.primary}`}
                    />
                    <div className="h-px bg-black" />
                    <div className="h-1/2 bg-white dark:bg-gray-200" />
                  </motion.div>
                  {/* Pokéball center button */}
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-black rounded-full" />
                  {/* Ping ring for ongoing roles */}
                  {exp.endDate === "Present" && (
                    <span
                      className={`pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-400 animate-ping`}
                    />
                  )}
                </div>

                {/* Quest badge — main-quest (briefcase, blue) or side-quest (flag, amber).
                    Sits inside the cartridge below the Pokéball cap; hover shows a styled tooltip. */}
                {(() => {
                  const quest = exp.isSide
                    ? {
                        Icon: Flag,
                        bg: "bg-amber-400 dark:bg-amber-500",
                        border: "border-amber-700 dark:border-amber-800",
                        iconColor: "text-amber-950",
                        tipBg: "bg-amber-100 dark:bg-amber-900/90",
                        tipBorder: "border-amber-400 dark:border-amber-600",
                        tipText: "text-amber-900 dark:text-amber-100",
                        label: "Side Quest",
                        desc: "Concurrent side business",
                      }
                    : {
                        Icon: Briefcase,
                        bg: "bg-sky-400 dark:bg-sky-500",
                        border: "border-sky-700 dark:border-sky-800",
                        iconColor: "text-sky-950",
                        tipBg: "bg-sky-100 dark:bg-sky-900/90",
                        tipBorder: "border-sky-400 dark:border-sky-600",
                        tipText: "text-sky-900 dark:text-sky-100",
                        label: "Main Quest",
                        desc: "Primary role",
                      };
                  const { Icon } = quest;
                  return (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 z-20 group/quest">
                      <div
                        className={`w-4 h-4 rounded-full ${quest.bg} border ${quest.border} shadow flex items-center justify-center transition-transform group-hover/quest:scale-110`}
                      >
                        <Icon className={`w-2 h-2 ${quest.iconColor}`} />
                      </div>
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 scale-95 group-hover/quest:opacity-100 group-hover/quest:scale-100 transition-all duration-150 pointer-events-none z-30">
                        <div
                          className={`${quest.tipBg} border ${quest.tipBorder} rounded-md px-2 py-1 shadow-lg whitespace-nowrap text-[10px] font-bold ${quest.tipText} backdrop-blur-sm`}
                        >
                          <div className="flex items-center gap-1">
                            <Icon className="w-2.5 h-2.5" />
                            <span>{quest.label}</span>
                          </div>
                          <div className="text-[9px] font-normal opacity-80 mt-0.5">
                            {quest.desc}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Cartridge foot — small accent at bottom */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.4 }}
                    className={`w-2 h-2 rounded-full bg-gradient-to-br ${colors.primary} border border-white dark:border-gray-800 shadow-sm opacity-80`}
                  />
                </div>

                {/* Simple Hover Tooltip */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 + 0.6 }}
                  className={`absolute left-7 top-1/2 transform -translate-y-1/2 transition-all duration-200`}
                >
                  {/* Clean minimal tooltip */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      scale: isHovered ? 1 : 0.9,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`whitespace-nowrap backdrop-blur-sm border shadow-lg rounded-lg px-3 py-2 bg-white/95 dark:bg-gray-800/95 border-gray-300 dark:border-gray-500 ${colors.textPrimary}`}
                    style={{
                      pointerEvents: isHovered ? "auto" : "none",
                    }}
                  >
                    {/* Company name with icon */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {exp.timelineTitle || exp.title}
                      </span>
                    </div>

                    {/* Role */}
                    <p
                      className={`text-base md:text-lg font-semibold ${colors.textSecondary}`}
                    >
                      {exp.role}
                    </p>

                    {/* Highlight - Quick description */}
                    <div
                      className={`text-sm md:text-base leading-relaxed ${colors.textTertiary} opacity-90`}
                    >
                      {exp.highlight}
                    </div>

                    {/* Date Range with enhanced styling */}
                    <div
                      className={`text-sm md:text-base flex items-center gap-3 px-3 py-2 rounded-lg ${colors.textTertiary} ${colors.bgAccent}`}
                    >
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">
                        {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        ·
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getDuration(exp.startDate, exp.endDate)}</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Simplified Mobile Timeline */}
      <div className="block lg:hidden mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>Experience Timeline</span>
        </div>
        <div className="space-y-2">
          {experiences.map((exp, index) => {
            const colors = getTimelineColors(index, false);

            return (
              <motion.div
                key={`mobile-timeline-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-3 h-3 rounded-full bg-gradient-to-br ${colors.primary} shadow-sm ${colors.glow}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {exp.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Experience Cards */}
      <div className="lg:ml-32 ml-0">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold mb-2 flex items-center text-gray-800 dark:text-gray-200"
        >
          <Briefcase className="mr-3 text-blue-600 dark:text-blue-400" />
          Professional Experience
        </motion.h2>

        {/* Total Experience Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex items-center gap-3 text-sm md:text-base text-gray-600 dark:text-gray-400"
        >
          <Clock className="w-4 h-4" />
          <span className="font-medium">10+ years of professional experience</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span>Software Engineering & Leadership</span>
        </motion.div>

        <div className="space-y-6">
          {experiences.map((exp, index) => {
            const colors = getTimelineColors(index, false);

            return (
              <motion.div
                key={index}
                initial={{ x: -50, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                }}
                transition={{ delay: index * 0.1 }}
                className={`group relative p-4 md:p-6 rounded-xl shadow-lg backdrop-blur-sm border transition-all duration-300 cursor-pointer
                  hover:shadow-xl ${colors.cardBg} ${colors.cardBorder} ${colors.cardHover}`}
                onMouseEnter={() => setHoveredExperience(index)}
                onMouseLeave={() => setHoveredExperience(null)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow space-y-2 md:space-y-3">
                    {/* Title and External Link */}
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={`font-bold text-lg md:text-xl transition-colors ${colors.textPrimary}`}
                      >
                        {exp.title}
                      </h3>
                      {exp.link && (
                        <Link
                          href={exp.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group-hover:scale-110 transition-all flex-shrink-0 p-1 rounded-md ${colors.buttonColors}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>

                    {/* Role */}
                    <p
                      className={`text-base md:text-lg font-semibold ${colors.textSecondary}`}
                    >
                      {exp.role}
                    </p>

                    {/* Highlight - Quick description */}
                    <div
                      className={`text-sm md:text-base leading-relaxed ${colors.textTertiary} opacity-90`}
                    >
                      {exp.highlight}
                    </div>

                    {/* Date Range with enhanced styling */}
                    <div
                      className={`text-sm md:text-base flex items-center gap-3 px-3 py-2 rounded-lg ${colors.textTertiary} ${colors.bgAccent}`}
                    >
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">
                        {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        ·
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getDuration(exp.startDate, exp.endDate)}</span>
                      </div>
                    </div>

                    {/* More Info Button */}
                    <button
                      onClick={() =>
                        setExpandedExperience(
                          expandedExperience === index ? null : index,
                        )
                      }
                      className={`text-sm md:text-base flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 
                        rounded-lg px-4 py-2 font-medium ${colors.buttonColors}`}
                      aria-expanded={expandedExperience === index}
                      aria-controls={`experience-details-${index}`}
                    >
                      {expandedExperience === index ? (
                        <>
                          Less info{" "}
                          <ChevronUp className="w-4 h-4 transition-transform" />
                        </>
                      ) : (
                        <>
                          More info{" "}
                          <ChevronDown className="w-4 h-4 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pokemon sprite - enhanced for better integration */}
                  <div className="relative flex-shrink-0 hidden md:block ml-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="relative"
                    >
                      <img
                        src={getPokemonSprite(experiencePokemons[index])}
                        alt={`Pokemon sprite`}
                        style={{
                          imageRendering: "pixelated",
                          ...getPokemonSpriteSize(experiencePokemons[index]),
                          transform: "scale(0.6)",
                        }}
                        className="object-contain transition-all duration-200 drop-shadow-lg"
                      />
                      {/* Subtle glow behind Pokemon */}
                      <div
                        className={`absolute inset-0 rounded-full blur-md opacity-30 ${colors.bulletColor}`}
                        style={{ transform: "scale(0.8)" }}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Details Section with enhanced styling */}
                <AnimatePresence>
                  {expandedExperience === index && (
                    <motion.div
                      id={`experience-details-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`mt-4 md:mt-6 p-4 rounded-lg border-l-4 ${colors.detailsBg}`}
                      >
                        <ul
                          className={`space-y-3 text-sm md:text-base ${colors.detailsText}`}
                        >
                          {exp.details.map((detail, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${colors.bulletColor}`}
                              />
                              <span className="leading-relaxed">{detail}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
