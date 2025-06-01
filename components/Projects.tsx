import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code,
  ExternalLink,
  Github,
  Calendar,
  Award,
  TrendingUp,
  Filter,
} from "lucide-react";
import Link from "next/link";

type Project = {
  title: string;
  description: string;
  year: string;
  details: string;
  link?: string;
  image: string;
  techStack: string[];
  category: "web" | "mobile" | "ai" | "game" | "iot";
  featured?: boolean;
  award?: string;
};

export const Projects = () => {
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [projectSortDirection, setProjectSortDirection] = useState<
    "asc" | "desc"
  >("desc");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const projects: Project[] = [
    {
      title: "Tahoe Snow Conditions",
      description:
        "Real-time ski resort conditions tracker for California and BC/Alberta",
      year: "2024",
      category: "web",
      featured: true,
      details:
        "A comprehensive ski conditions monitoring platform that aggregates real-time data from ski resorts across California and British Columbia/Alberta. Features live snow reports, weather conditions, trail status, and lift operations. Built with modern web technologies to provide skiers and snowboarders with up-to-date resort information for trip planning.",
      link: "https://tahoesno.onrender.com/",
      image: "/projects/tahoe-snow.png",
      techStack: [
        "React",
        "Node.js",
        "Weather API",
        "Resort APIs",
        "TypeScript",
        "Tailwind CSS",
      ],
    },
    {
      title: "Mushroom Weather Dashboard",
      description:
        "Weather analysis tool for mushroom foraging with interactive mapping",
      year: "2024",
      category: "web",
      featured: true,
      details:
        "Developed an interactive weather dashboard that helps foragers determine potential mushroom locations based on historical and forecasted weather conditions. Users can select locations via map interface or coordinates to analyze 10-day historical and future weather patterns optimal for mushroom growth.",
      link: "https://mushroom-weather.s3.us-west-2.amazonaws.com/index.html",
      image: "/projects/mushroom-weather.png",
      techStack: [
        "React",
        "AWS S3",
        "Weather API",
        "Mapbox",
        "TypeScript",
        "Tailwind CSS",
      ],
    },
    {
      title: "Unreal Sensor Simulation",
      description:
        "Virtual simulation environment with custom sensor configurations",
      year: "2018",
      category: "ai",
      featured: true,
      award: "Best Presentation Award - $1000",
      details:
        "Architected and implemented a flexible sensor configuration system in a virtual environment, empowering users to customize their experience with an unlimited number of camera and lidar sensors. Won Best Presentation Award and $1000 cash prize.",
      link: "https://example.com/unreal-sensor-simulation",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Unreal Engine", "C++", "Python", "CUDA"],
    },
    {
      title: "Home.ly",
      description: "IoT wireless ad-hoc network for smart home monitoring",
      year: "2017",
      category: "iot",
      featured: true,
      details:
        "Developed an IoT system that monitors the ambient environment of separate rooms in your home. Equipped with a microphone array to track snoring patterns and humidity sensors to monitor house plants. Built with Microsoft Azure IoT Hub, NodeJS, DynamoDB, and hosted on Azure Web services.",
      link: "https://github.com/billykeyss/home.ly",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Node.js", "Azure IoT", "DynamoDB", "React"],
    },
    {
      title: "Animal Crossing Market Predictor",
      description: "ML-powered game data analysis and prediction platform",
      year: "2020",
      category: "ai",
      details:
        "Created a comprehensive platform for Animal Crossing New Horizons data analysis, including price prediction algorithms, market trend analysis, and availability forecasting for bugs, fish, and turnip prices.",
      link: "https://acnh.s3.us-west-2.amazonaws.com/index.html",
      image: "/projects/acnh.png",
      techStack: ["React", "Node.js", "MongoDB", "Python", "ML Models"],
    },
    {
      title: "Palette",
      description: "AI-powered color palette extraction from camera feed",
      year: "2019",
      category: "mobile",
      details:
        "Analyzes an image/camera feed and extracts a custom color palette from it using advanced computer vision algorithms. Developed using Kotlin on Android, implementing modern best practices for MVVM Architecture and using Room database to cache data and maintain history.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: [
        "Kotlin",
        "Android",
        "MVVM",
        "Room DB",
        "Camera API",
        "Computer Vision",
      ],
    },
    {
      title: "RapBot",
      description: "Alexa rapping skill with dynamic lyrics generation",
      year: "2017",
      category: "ai",
      award: "Hackathon Winner - $250",
      details:
        "Developed a rapping skill for the Alexa voice interface at Amazon x Connected Lab hackathon. Features dynamic rap generation and rhythm matching. Won best hack and $250 Prize.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["AWS Lambda", "S3", "Alexa Skills Kit", "Node.js", "NLP"],
    },
    {
      title: "TapExchange",
      description: "NFC-based contact exchange mobile application",
      year: "2016",
      category: "mobile",
      details:
        "Developed an Android Application that uses NFC to allow users to exchange contact information by tapping their phones together. Implemented secure transfer of contact information and NFC methods.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Android", "Java", "NFC API", "Contacts API"],
    },
    {
      title: "Casty",
      description: "Household movie queue and streaming platform",
      year: "2018",
      category: "iot",
      details:
        "A household movie queue and streaming device built for the Raspberry Pi, enabling local media streaming, queue management, and multi-user controls.",
      image: "/projects/casty.png",
      techStack: ["Node.js", "Raspberry Pi", "React", "Express", "WebRTC"],
    },
    {
      title: "Pong Neural Network",
      description: "AI-enhanced classic game with reinforcement learning",
      year: "2016",
      category: "game",
      details:
        "A modern recreation of the classic game of Pong using Unity game engine, featuring AI opponents trained with reinforcement learning and adaptive difficulty.",
      image: "/projects/pong.png",
      techStack: ["Unity", "C#", "ML-Agents", "Reinforcement Learning"],
    },
  ];

  const categories = [
    { id: "all", label: "All Projects", icon: Code },
    { id: "ai", label: "AI & ML", icon: TrendingUp },
    { id: "web", label: "Web Apps", icon: Code },
    { id: "mobile", label: "Mobile", icon: Code },
    { id: "iot", label: "IoT", icon: Code },
    { id: "game", label: "Games", icon: Code },
  ];

  const getFilteredProjects = () => {
    const filtered =
      selectedCategory === "all"
        ? projects
        : projects.filter((p) => p.category === selectedCategory);

    return filtered.sort((a, b) => {
      const yearA = parseInt(a.year);
      const yearB = parseInt(b.year);
      return projectSortDirection === "desc" ? yearB - yearA : yearA - yearB;
    });
  };

  const featuredProjects = projects.filter((p) => p.featured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <Code className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Featured Projects
          </h2>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A collection of applications, research projects, and creative
          experiments spanning web development, AI/ML, mobile apps, and IoT
          systems.
        </p>
      </motion.div>

      {/* Featured Projects Showcase */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Highlighted Work
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featuredProjects.map((project, index) => (
            <ProjectShowcaseCard
              key={project.title}
              project={project}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Filters and Controls */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 
        p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl 
        border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium 
                  transition-all duration-200 ${
                    selectedCategory === category.id
                      ? "bg-blue-500 dark:bg-teal-500 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() =>
            setProjectSortDirection((prev) =>
              prev === "desc" ? "asc" : "desc"
            )
          }
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {projectSortDirection === "desc" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {/* All Projects Grid */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          All Projects ({getFilteredProjects().length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {getFilteredProjects().map((project, index) => (
              <ProjectCard
                key={`${project.title}-${selectedCategory}`}
                project={project}
                index={index}
                isExpanded={expandedProject === index}
                onToggle={() =>
                  setExpandedProject(expandedProject === index ? null : index)
                }
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ProjectShowcaseCard = ({
  project,
  index,
}: {
  project: Project;
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border border-gray-200/50 dark:border-gray-700/50
        shadow-lg shadow-black/5 dark:shadow-black/20
        hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30
        transition-all duration-300 ease-out"
    >
      {project.award && (
        <div className="absolute top-4 right-4 z-10">
          <span
            className="px-3 py-1 text-xs font-bold rounded-full 
            bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm"
          >
            <Award className="w-3 h-3 inline mr-1" />
            Award Winner
          </span>
        </div>
      )}

      <div className="p-6 space-y-4">
        <div>
          <h3
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 
            group-hover:text-blue-600 dark:group-hover:text-teal-400 transition-colors"
          >
            {project.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {project.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 text-xs font-medium rounded-lg
                bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                border border-gray-200 dark:border-gray-700"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{project.techStack.length - 4} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            {project.year}
          </div>

          {project.link && (
            <Link
              href={project.link}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-blue-500 dark:bg-teal-500 text-white hover:bg-blue-600 dark:hover:bg-teal-600
                transition-colors duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              View Project
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ProjectCard = ({
  project,
  index,
  isExpanded,
  onToggle,
}: {
  project: Project;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border border-gray-200/50 dark:border-gray-700/50
        shadow-lg shadow-black/5 dark:shadow-black/20
        hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30
        transition-all duration-300 ease-out cursor-pointer"
      onClick={onToggle}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <h3
            className="font-bold text-lg text-gray-900 dark:text-gray-100 
            group-hover:text-blue-600 dark:group-hover:text-teal-400 transition-colors"
          >
            {project.title}
          </h3>
          <span
            className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 
            px-2 py-1 rounded-lg"
          >
            {project.year}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {project.description}
        </p>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {project.details}
                </p>

                {project.award && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      <Award className="w-4 h-4" />
                      {project.award}
                    </div>
                  </div>
                )}

                {project.link && (
                  <Link
                    href={project.link}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-teal-400 
                      hover:text-blue-700 dark:hover:text-teal-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Project
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 text-xs font-medium rounded-md
                bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{project.techStack.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center pt-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
    </motion.div>
  );
};
