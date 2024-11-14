import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getPokemonSprite,
  getRandomPokemonName,
  getPokemonSpriteSize,
} from "@/utils/pokemon";

type Experience = {
  title: string;
  timelineTitle: string;
  role: string;
  startDate: string;
  endDate: string;
  details: string[];
  link?: string;
};

// Add a utility function to check if we're on mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
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

export const Experiences = () => {
  const isMobile = useIsMobile();
  const [expandedExperience, setExpandedExperience] = useState<number | null>(
    null
  );
  const [experiencePokemons, setExperiencePokemons] = useState<string[]>([]);

  const experiences: Experience[] = [
    {
      title: "Sesh",
      timelineTitle: "Sesh",
      role: "Founder",
      startDate: "2023-03",
      endDate: "Present",
      details: [
        "Founded and launched an e-commerce platform specializing in premium climbing gear and accessories.",
        "Designed and developed product line including chalk bags, chalk buckets, brushes, and training equipment.",
        "Built full e-commerce platform with Shopify integration, payment processing, and inventory management.",
        "Implemented international shipping capabilities supfporting both USD and CAD currencies.",
        "Established social media presence across Facebook, Instagram, and TikTok platforms.",
      ],
      link: "https://climbingsesh.com/",
    },
    {
      title: "Keplar",
      timelineTitle: "Keplar",
      role: "Founding Engineer",
      startDate: "2024-04",
      endDate: "Present",
      details: [
        "Developing a platform for AI-powered audience simulation services.",
      ],
      link: "https://www.keplar.io/",
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

  const getTimelinePosition = (date: string): number => {
    const startYear = 2015;
    const now = new Date();
    const targetDate = date === "Present" ? now : new Date(date + "-01");
    const yearDiff = targetDate.getFullYear() - startYear;
    const monthDiff = targetDate.getMonth();
    const totalMonths =
      (new Date().getFullYear() - startYear) * 12 + new Date().getMonth();
    const dateMonths = yearDiff * 12 + monthDiff;
    return (totalMonths - dateMonths) * 10;
  };

  const timelineColors = [
    "border-blue-500",
    "border-green-500",
    "border-purple-500",
    "border-orange-500",
    "border-pink-500",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-[1000px]"
    >
      {/* Year markers and Timeline - hidden on mobile */}
      <div className="hidden md:block">
        {/* Year markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const year = new Date().getFullYear() - i;
          const position = i * 120;
          return (
            <div
              key={`year-${year}`}
              className="absolute -left-16 text-sm text-gray-400 dark:text-gray-500"
              style={{ top: `${position}px` }}
            >
              {year}
            </div>
          );
        })}

        {/* Timeline */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600 shadow-sm">
          {experiences.map((exp, index) => {
            const startY = getTimelinePosition(exp.startDate);
            const endY = getTimelinePosition(exp.endDate);
            const colorIndex = index % timelineColors.length;
            const offset =
              experiences.slice(0, index).filter((prevExp) => {
                const prevStart = getTimelinePosition(prevExp.startDate);
                const prevEnd = getTimelinePosition(prevExp.endDate);
                return (
                  (startY >= prevEnd && startY <= prevStart) ||
                  (endY >= prevEnd && endY <= prevStart) ||
                  (startY <= prevEnd && endY >= prevStart)
                );
              }).length * 20;

            const isSesh = exp.timelineTitle === "Sesh";

            return (
              <div
                key={`timeline-${index}`}
                className={`absolute ${timelineColors[colorIndex]} shadow-md dark:opacity-80`}
                style={{
                  top: `${endY}px`,
                  height: `${startY - endY}px`,
                  left: `${4 + offset}px`,
                  width: "16px",
                  borderRight: "2px solid",
                  borderTop: "2px solid",
                  borderBottom: "2px solid",
                  borderTopRightRadius: "4px",
                  borderBottomRightRadius: "4px",
                }}
              >
                <div
                  className={`absolute text-xs text-gray-600 dark:text-gray-100 font-bold ${
                    isSesh ? "writing-vertical" : ""
                  }`}
                  style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                    ...(isSesh
                      ? {
                          right: "0px",
                          writingMode: "vertical-lr",
                          textOrientation: "upright",
                          letterSpacing: "0.1em",
                          height: "fit-content",
                        }
                      : {
                          left: "24px",
                        }),
                  }}
                >
                  {exp.timelineTitle || exp.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Experience Cards */}
      <div className="md:ml-24 ml-4">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800 dark:text-gray-200">
          <Briefcase className="mr-2" />
          Experiences
        </h2>
        {experiences.map((exp, index) => (
          <motion.div
            key={index}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="mb-8 p-3 md:p-4 bg-gray-100 dark:bg-gray-900/60 rounded-lg shadow-md relative
              hover:bg-gray-200 dark:hover:bg-gray-900/80 
              border border-transparent dark:border-gray-700
              transition-all duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex-grow space-y-1 md:space-y-2">
                {/* Title and External Link */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-gray-100">
                    {exp.title}
                  </h3>
                  {exp.link && (
                    <Link
                      href={exp.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 
                        transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {/* Role */}
                <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 font-medium">
                  {exp.role}
                </p>

                {/* Date Range */}
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span>
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                  <span>{getDuration(exp.startDate, exp.endDate)}</span>
                </p>

                {/* More Info Button */}
                <button
                  onClick={() =>
                    setExpandedExperience(
                      expandedExperience === index ? null : index
                    )
                  }
                  className="text-sm md:text-base text-red-500 dark:text-red-400 
                    hover:text-red-600 dark:hover:text-red-300 
                    flex items-center transition-colors focus:outline-none focus:ring-2 
                    focus:ring-red-500 dark:focus:ring-red-400 rounded-md
                    hover:bg-gray-200 dark:hover:bg-gray-800/60 px-2 py-1"
                  aria-expanded={expandedExperience === index}
                  aria-controls={`experience-details-${index}`}
                >
                  {expandedExperience === index ? (
                    <>
                      Less info <ChevronUp className="ml-1 w-4 h-4" />
                    </>
                  ) : (
                    <>
                      More info <ChevronDown className="ml-1 w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Pokemon sprite - hidden on mobile */}
              <div className="relative flex-shrink-0 hidden md:block">
                <img
                  src={getPokemonSprite(experiencePokemons[index])}
                  alt={`Pokemon sprite`}
                  style={{
                    imageRendering: "pixelated",
                    ...getPokemonSpriteSize(experiencePokemons[index]),
                    transform: "scale(0.5)",
                  }}
                  className="object-contain transition-transform duration-200 hover:scale-110"
                />
              </div>
            </div>

            {/* Details Section */}
            <AnimatePresence>
              {expandedExperience === index && (
                <motion.ul
                  id={`experience-details-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 md:mt-4 list-disc list-inside text-sm md:text-base 
                    text-gray-700 dark:text-gray-300 pl-2 md:pl-4 space-y-2"
                >
                  {exp.details.map((detail, i) => (
                    <li key={i} className="mt-1">
                      <span className="ml-[-4px]">{detail}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
