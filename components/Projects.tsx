import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp, Code, ExternalLink } from "lucide-react";
import Link from "next/link";

type Project = {
  title: string;
  description: string;
  year: string;
  details: string;
  link?: string;
  image: string;
  techStack: string[];
};

export const Projects = () => {
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [projectSortDirection, setProjectSortDirection] = useState<
    "asc" | "desc"
  >("desc");

  const projects: Project[] = [
    {
      title: "Mushroom Weather Dashboard",
      description: "Weather analysis tool for mushroom foraging",
      year: "2024",
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
      description: "Created a virtual simulation environment in Unreal Engine",
      year: "2018",
      details:
        "Architected and implemented a flexible sensor configuration system in a virtual environment, empowering users to customize their experience with an unlimited number of camera and lidar sensors. Won Best Presentation Award and $1000 cash prize.",
      link: "https://example.com/unreal-sensor-simulation",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Unreal Engine", "C++", "Python", "CUDA"],
    },
    {
      title: "Home.ly",
      description: "IoT Wireless Ad-Hoc Network for home monitoring",
      year: "2017",
      details:
        "Developed an IoT system that monitors the ambient environment of separate rooms in your home. Equipped with a microphone array to track snoring patterns and humidity sensors to monitor house plants. Built with Microsoft Azure IoT Hub, NodeJS, DynamoDB, and hosted on Azure Web services.",
      link: "https://example.com/home-ly",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["nodejs", "azure", "dynamodb", "react"],
    },
    {
      title: "Animal Crossing New Horizons Data Look up",
      description: "Website for ACNH game data",
      year: "2020",
      details:
        "Created a simple website that displays data about the bugs and fish in Animal Crossing New Horizons, including price, location, size, date, and time availability.",
      link: "https://acnh.s3.us-west-2.amazonaws.com/index.html",
      image: "/projects/acnh.png",
      techStack: ["react", "nodejs", "mongodb"],
    },
    {
      title: "Palette",
      description: "Color palette extraction from camera feed",
      year: "2019",
      details:
        "Analyzes an image/camera feed and extracts a custom color palette from it. Developed using Kotlin on Android, implementing modern best practices for MVVM Architecture and using Room database to cache data and maintain history.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Kotlin", "Android", "MVVM", "Room DB", "Camera API"],
    },
    {
      title: "Chemordle",
      description: "Wordle clone for chemistry elements",
      year: "2022",
      details:
        "Created a chemistry-themed version of the popular Wordle game, focusing on chemical elements. Players guess elements based on atomic properties and receive feedback on their guesses.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["React", "TypeScript", "Chemistry API"],
    },
    {
      title: "RapBot",
      description: "Alexa rapping skill - Hackathon Winner",
      year: "2017",
      details:
        "Developed a rapping skill for the Alexa voice interface at Amazon x Connected Lab hackathon. Developed using AWS Lambda and S3. Won best hack and $250 Prize.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["AWS Lambda", "S3", "Alexa Skills Kit", "Node.js"],
    },
    {
      title: "TapExchange",
      description: "NFC-based contact exchange app",
      year: "2016",
      details:
        "Developed an Android Application that uses NFC to allow users to exchange contact information by tapping their phones together. Implemented transfer of contact information and NFC methods.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Android", "Java", "NFC API", "Contacts API"],
    },
    {
      title: "PedometerMap",
      description: "Advanced pedometer with mapping",
      year: "2016",
      details:
        "Designed and implemented a pedometer using finite state machines and sensor event handlers. Contains map loading and path finding capabilities, utilizes low pass and high pass filters to account for noise in sensor data.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Android", "Java", "Google Maps API", "Sensor API", "FSM"],
    },
    {
      title: "Casty",
      description: "Household movie queue and streaming device",
      year: "2018",
      details:
        "A household movie queue and streaming device built for the Raspberry Pi, enabling local media streaming and queue management.",
      image: "/projects/casty.png",
      techStack: ["Node.js", "Raspberry Pi", "React", "Express"],
    },
    {
      title: "Portfolio Sites",
      description: "Dynamic portfolio website platform",
      year: "2017",
      details:
        "Portfolio style website created using Node, Express and Pug templating engine, featuring dynamic content management and responsive design.",
      image: "/projects/portfolio-site.png",
      techStack: ["Node.js", "Express", "Pug", "CSS3"],
    },
    {
      title: "Pong Recreation",
      description: "Classic game recreation",
      year: "2016",
      details:
        "A modern recreation of the classic game of Pong using Unity game engine, featuring updated graphics and gameplay mechanics.",
      image: "/projects/pong.png",
      techStack: ["Unity", "C#", "Game Design"],
    },
  ];

  const getSortedProjects = () => {
    return [...projects].sort((a, b) => {
      const yearA = parseInt(a.year);
      const yearB = parseInt(b.year);
      return projectSortDirection === "desc" ? yearB - yearA : yearA - yearB;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center text-gray-800 dark:text-gray-200">
          <Code className="mr-2" />
          Projects
        </h2>
        <button
          onClick={() =>
            setProjectSortDirection((prev) =>
              prev === "desc" ? "asc" : "desc"
            )
          }
          className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 
            flex items-center transition-colors px-2 py-1 rounded-md
            hover:bg-gray-100 dark:hover:bg-gray-800/60"
        >
          Sort by Year {projectSortDirection === "desc" ? "↓" : "↑"}
        </button>
      </div>
      {getSortedProjects().map((project, index) => (
        <motion.div
          key={index}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="mb-4 p-4 bg-gray-100 dark:bg-gray-900/60 rounded-lg shadow-md
            hover:bg-gray-200 dark:hover:bg-gray-900/80 
            border border-transparent dark:border-gray-700
            transition-all duration-200"
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {project.title}
              </h3>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {project.year}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {project.techStack.map((tech, i) => (
                <span
                  key={i}
                  className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 
                    px-3 py-1 rounded-full text-sm shadow-sm
                    hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center">
              <button
                onClick={() =>
                  setExpandedProject(expandedProject === index ? null : index)
                }
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 
                  flex items-center mr-4 transition-colors focus:outline-none focus:ring-2 
                  focus:ring-red-500 dark:focus:ring-red-400 rounded-md
                  hover:bg-gray-200 dark:hover:bg-gray-800/60 px-2 py-1"
                aria-expanded={expandedProject === index}
                aria-controls={`project-details-${index}`}
              >
                {expandedProject === index ? (
                  <>
                    Less info <ChevronUp className="ml-1" />
                  </>
                ) : (
                  <>
                    More info <ChevronDown className="ml-1" />
                  </>
                )}
              </button>
              {project.link && (
                <Link
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 
                    hover:underline flex items-center transition-colors
                    hover:bg-gray-200 dark:hover:bg-gray-800/60 px-2 py-1 rounded-md"
                >
                  View Project <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              )}
            </div>
          </div>
          <AnimatePresence>
            {expandedProject === index && (
              <motion.div
                id={`project-details-${index}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-4"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-40 object-cover rounded-md mb-4 
                    dark:opacity-90 shadow-md"
                />
                <p className="text-gray-700 dark:text-gray-300">
                  {project.details}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  );
};
