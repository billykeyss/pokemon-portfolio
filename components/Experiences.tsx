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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Experience = {
  title: string;
  timelineTitle: string;
  role: string;
  startDate: string;
  endDate: string;
  details: string[];
  link?: string;
};

// Add this utility function for formatting dates
const formatDate = (dateString: string): string => {
  if (dateString === "Present") return "Present";

  const date = new Date(dateString + "-01"); // Add day for proper parsing
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
  startYear: number = 2015
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
    null
  );
  const [experiencePokemons, setExperiencePokemons] = useState<string[]>([]);
  const [hoveredExperience, setHoveredExperience] = useState<number | null>(
    null
  );

  const experiences: Experience[] = [
    {
      title: "Keplar.io",
      timelineTitle: "Keplar.io",
      role: "Founding Engineer",
      startDate: "2024-04",
      endDate: "Present",
      details: [
        "As a founding engineer, I lead development of Keplar's audience simulation platform from concept to production, leveraging state-of-the-art LLMs, RAG, and agentic architectures. Built robust, scalable infrastructure for AI-driven user feedback simulations across a modern SaaS stack (TypeScript, Node.js, Temporal, Elasticsearch, PostgreSQL).",
        "Architected and launched an agentic simulation engine using the Observe-Reflect-Act (ORA) paradigm, enabling lifelike, context-aware synthetic audience feedback for enterprise clients.",
        "Designed and deployed vector based Retrieval-Augmented Generation (RAG) pipelines to ground LLM outputs in proprietary user data, increasing relevance and accuracy of simulated feedback by over 60%.",
        "Implemented vector embedding and semantic search using Elasticsearch, enabling instant retrieval of audience segments and real-time scenario benchmarking; supported 25,000+ unique synthetic audience profiles at scale.",
        "Integrated Multi-Context Protocols (MCP) for advanced context switching and memory in simulated agents, enhancing simulation fidelity and product test coverage.",
        "Reduced traditional product feedback cycles by up to 95%, accelerating enterprise customer time-to-insight from weeks to hours.",
      ],
      link: "https://www.keplar.io/",
    },
    {
      title: "Sesh",
      timelineTitle: "Sesh",
      role: "Founder",
      startDate: "2022-10",
      endDate: "Present",
      details: [
        "Launched Sesh Climbing (climbingsesh.com), a direct-to-consumer brand for premium climbing gear—from concept and naming to Shopify storefront, 3PL workflows, and multi-currency checkout in USD & CAD.",
        "Designed and released a 10-SKU product line including chalk buckets, modular chalk bags, boar-hair brushes, 3D-printed training blocks, and pure magnesium-carbonate chalk, all produced with local suppliers and in-house additive manufacturing.",
        "Maintained a 4.8-star-plus customer rating across the store, with the flagship BOLDER SESH chalk bucket earning a 4.86/5 average from 14 verified reviews.",
        "Secured partnerships with six regional climbing gyms to host pop-up events, doubling the email list and driving 30% month-over-month revenue lifts during campaign weeks.",
        "Built an end-to-end commerce stack—Shopify Liquid customizations, Klaviyo automations, Stripe & Shop Pay integration, and Pirate Ship for cross-border fulfillment—cutting average dispatch time to 48 hours and keeping returns under 1%.",
        "Grew social presence from zero to 3k+ followers in six months on Instagram, TikTok, and Facebook through product-demo reels and user-generated content challenges, reaching 150k organic impressions per quarter.",
        "Led brand identity and packaging design (logo, print collateral, unboxing experience), boosting on-site conversion to 14% and enabling repeat-purchase email flows that now account for 25% of revenue.",
      ],
      link: "https://climbingsesh.com/",
    },
    {
      title: "V12 Resole",
      timelineTitle: "V12 Resole",
      role: "CTO (Consultant → Full-time)",
      startDate: "2023-10",
      endDate: "Present",
      details: [
        "Transitioned from technical consultant to CTO, leading full-stack development and hardware engineering initiatives for a climbing shoe resole service.",
        "Engineered an end-to-end Resole Service Management (RSM) platform in Node.js + TypeScript (NX monorepo), React, PostgreSQL, and Docker, integrating Square & Shopify POS APIs for order intake, invoicing, and inventory sync. → 65% cut in manual admin time and 3× order-throughput capacity without extra head-count.",
        'Designed a 24/7 "Smart Drop-Box" for contact-free pick-up/drop-off: Raspberry Pi + GPIO-controlled electronic lock, QR-code reader, LCD, and an Express/Tailscale VPN backend for secure remote updates. → 28% growth in monthly shoe intakes and lost-item rate < 1%.',
        "Built a real-time production dashboard (React Flow + MUI) with drag-and-drop Kanban stages, barcode scanning, and live metrics. → 50% reduction in workshop search time and <5 min average status update latency.",
        'Authored a TypeScript "SquareService" SDK wrapping 14 critical endpoints (orders, payments, customers) and a Shopify webhook processor; now drives 100% of financial transactions with < 0.2% sync errors.',
        "Launched an AI-powered cobbler training portal (OpenAI GPT based RAG over internal videos & SOPs) that auto-generates step-by-step repair guidance and quizzes. → On-the-tools proficiency time cut from 6 weeks to 2 weeks for new hires.",
        "Implemented CI/CD on Render with blue-green deploys; maintains 99.9% uptime and < 5 min rollback windows.",
      ],
      link: "https://www.v12resole.com/",
    },
    {
      title: "Amazon Lab 126, Astro",
      timelineTitle: "Astro",
      role: "Senior Software Development Engineer",
      startDate: "2022-04",
      endDate: "2024-03",
      details: [
        "Championed the complete lifecycle of multiple feature developments, orchestrating cross-functional collaboration with QA, TPM, and PM teams.",
        "Delegated tasks among team members, optimizing productivity. Directed onboarding of 12 consumer development teams.",
        "Pioneered in-house device simulation lab using Hardware-In-Loop setup.",
        "Integrated integration tests into release pipeline with automated test reports.",
        "Orchestrated integrations throughout Android AOSP stack including System Apps, Services, Native C++ Libraries, HAL, and Kernel elements.",
        "Utilized C++, Java, Python, Ruby, JavaScript, Kotlin, and ROS for seamless integration.",
      ],
      link: "https://www.aboutamazon.com/news/devices/meet-astro",
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineer II",
      startDate: "2020-04",
      endDate: "2022-03",
      details: [
        "Developed Amazon Astro Robot's core platform and services using C++, Java, Python, Ruby, Javascript, ROS.",
        "Developed novel phone battery notifier feature for Astro.",
        "Created remote device debugging interface with multi-SOC system health monitor.",
        "Created in-house device simulation lab for automated integration testing.",
      ],
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineer I",
      startDate: "2018-08",
      endDate: "2020-03",
      details: [
        "Led development on FireTV news application, creating system architecture.",
        "Engineered high-performing application for 11 FireTV platforms.",
        "Provided 24-hour operational support for service hitting 3000 TPS.",
        "Reduced p50 cold start latency by 25% and p90 by 60%.",
      ],
      link: "https://amazonfiretv.blog/introducing-the-news-app-on-fire-tv-5138d80a8dc9",
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineering Intern",
      startDate: "2017-08",
      endDate: "2017-12",
      details: [
        "Developed Amazon Video Application for Echo devices and tablets.",
        "Created production-ready web video application with third-party integrations.",
        "Led development on Zoom Voice Support with NLU and CSM.",
      ],
    },
    {
      title: "Connected Lab",
      timelineTitle: "Connected",
      role: "Solutions Architect Engineering Intern",
      startDate: "2017-01",
      endDate: "2017-05",
      details: [
        "Implemented programmable chatbot interface using Watson API (NLP).",
        "Prototyped experimental android application with face recognition.",
        "Developed video processing interface using Android NDK.",
      ],
    },
    {
      title: "Connected Lab",
      timelineTitle: "Connected",
      role: "Software Engineering Intern",
      startDate: "2016-01",
      endDate: "2016-05",
      details: [
        "Built resource allocation tool using ReactJS and Node.",
        "Developed core server functionality with Redux.",
        "Built Jenkins pipeline infrastructure.",
        "Improved unit testing coverage while reducing testing time by 90%.",
      ],
    },
    {
      title: "nanoPay",
      timelineTitle: "nanoPay",
      role: "Frontend Developer Intern",
      startDate: "2015-05",
      endDate: "2015-09",
      details: [
        "Implemented UI/UX of Android app and AngularJS responsive website.",
        "Integrated REST APIs and payment processing systems.",
        "Collaborated with designers to implement high-quality UI components.",
        "Established CI/CD pipeline for automated testing and deployment.",
      ],
    },
  ];

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
        <div className="absolute -left-20 top-0">
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

            // Smart positioning to avoid overlaps
            const layerOffset = index % 3; // Alternate between 3 layers
            const offsetX = 4 + layerOffset * 24;

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
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    colors.primary
                  } transition-opacity duration-200 ${
                    isHovered ? "opacity-100" : "opacity-90 dark:opacity-80"
                  }`}
                />

                {/* Glow Effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    colors.primary
                  } ${colors.glow} blur-sm transition-opacity duration-200 ${
                    isHovered ? "opacity-60" : "opacity-40"
                  }`}
                />

                {/* Timeline Dot at top */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.2 + 0.3 }}
                  className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-br ${colors.primary} rounded-full shadow-lg ${colors.glow} border-2 border-white dark:border-gray-800 transition-all duration-200`}
                />

                {/* Timeline Dot at bottom */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.2 + 0.4 }}
                  className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gradient-to-br ${colors.primary} rounded-full shadow-md border border-white dark:border-gray-800 opacity-75 transition-all duration-200`}
                />

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

                    {/* Simple role */}
                    <div className="text-xs opacity-75 mt-1">{exp.role}</div>
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
          className="text-2xl md:text-3xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200"
        >
          <Briefcase className="mr-3 text-blue-600 dark:text-blue-400" />
          Professional Experience
        </motion.h2>

        <div className="space-y-6">
          {experiences.map((exp, index) => {
            const colors = getTimelineColors(index, false);
            const isHovered = hoveredExperience === index;

            return (
              <motion.div
                key={index}
                initial={{ x: -50, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  scale: isHovered ? 1.02 : 1,
                  y: isHovered ? -4 : 0,
                }}
                transition={{ delay: index * 0.1 }}
                className={`group relative p-4 md:p-6 rounded-xl shadow-lg backdrop-blur-sm border transition-all duration-300 cursor-pointer
                  hover:shadow-xl ${colors.cardBg} ${colors.cardBorder} ${
                  colors.cardHover
                } ${
                  isHovered ? `ring-2 ring-offset-2 ${colors.cardRing}` : ""
                }`}
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
                          expandedExperience === index ? null : index
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
                      whileHover={{ scale: 1.1, rotate: 5 }}
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
