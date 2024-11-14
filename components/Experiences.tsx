import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getPokemonSprite, getRandomPokemonName } from "@/utils/pokemon";

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
      link: "keplar.io",
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
      startDate: "2017-09",
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
      endDate: "2017-04",
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
      endDate: "2016-04",
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
      endDate: "2015-08",
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
        {Array.from({ length: 9 }).map((_, i) => {
          const year = new Date().getFullYear() - i;
          const position = i * 120;
          return (
            <div
              key={`year-${year}`}
              className="absolute -left-16 text-sm text-gray-400"
              style={{ top: `${position}px` }}
            >
              {year}
            </div>
          );
        })}

        {/* Timeline */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 shadow-sm">
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
                className={`absolute ${timelineColors[colorIndex]} shadow-md`}
                style={{
                  top: `${endY}px`,
                  height: `${startY - endY}px`,
                  left: `${-8 + offset}px`,
                  width: "16px",
                  borderRight: "2px solid",
                  borderTop: "2px solid",
                  borderBottom: "2px solid",
                  borderTopRightRadius: "4px",
                  borderBottomRightRadius: "4px",
                }}
              >
                <div
                  className={`absolute text-xs text-gray-600 font-bold ${
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

      {/* Experience Cards - adjusted margin for mobile */}
      <div className="md:ml-24 ml-4">
        {" "}
        {/* Reduced left margin on mobile */}
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Briefcase className="mr-2" />
          Experiences
        </h2>
        {experiences.map((exp, index) => (
          <motion.div
            key={index}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="mb-8 p-4 bg-gray-100 rounded relative"
          >
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{exp.title}</h3>
                  {exp.link && (
                    <Link
                      href={exp.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                <p>{exp.role}</p>
                <p className="text-sm text-gray-600">
                  {exp.startDate} - {exp.endDate}
                </p>
                <button
                  onClick={() =>
                    setExpandedExperience(
                      expandedExperience === index ? null : index
                    )
                  }
                  className="mt-2 text-red-500 flex items-center"
                  aria-expanded={expandedExperience === index}
                  aria-controls={`experience-details-${index}`}
                >
                  {expandedExperience === index ? (
                    <>
                      Less info <ChevronUp className="ml-1" />
                    </>
                  ) : (
                    <>
                      More info <ChevronDown className="ml-1" />
                    </>
                  )}
                </button>
              </div>
              <img
                src={getPokemonSprite(experiencePokemons[index])}
                alt={`Pokemon sprite`}
                className="w-16 h-16 pixelated"
              />
            </div>
            <AnimatePresence>
              {expandedExperience === index && (
                <motion.ul
                  id={`experience-details-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 list-disc list-inside"
                >
                  {exp.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
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
