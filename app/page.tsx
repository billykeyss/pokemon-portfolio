"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Star,
  Code,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  GraduationCap,
  Heart,
  Image,
} from "lucide-react";
import Link from "next/link";
import {
  getRandomPokemonName,
  getTypeColor,
  getPokemonSprite,
  fetchRandomPokemonSprite,
} from "@/utils/pokemon";

type Experience = {
  title: string;
  role: string;
  date: string;
  pokemon: string;
  details: string[];
  link?: string;
};

export default function Component() {
  const [activeSection, setActiveSection] = useState("experiences");
  const [pokemonSprite, setPokemonSprite] = useState(
    "/placeholder.svg?height=96&width=96"
  );
  const [expandedExperience, setExpandedExperience] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [expandedEducation, setExpandedEducation] = useState(null);
  const [experiencePokemons, setExperiencePokemons] = useState<string[]>([]);
  const [projectSortDirection, setProjectSortDirection] = useState<
    "asc" | "desc"
  >("desc");

  useEffect(() => {
    fetchPokemonSprite();
    const pokemons = sections.experiences.map(() => getRandomPokemonName());
    setExperiencePokemons(pokemons);
  }, []);

  const fetchPokemonSprite = async () => {
    const response = await fetch(
      "https://pokeapi.co/api/v2/pokemon/" + Math.floor(Math.random() * 151)
    );
    const data = await response.json();
    setPokemonSprite(data.sprites.front_default);
  };

  const sections = {
    experiences: [
      {
        title: "Sesh",
        role: "Founder",
        date: "January 2024 - Present",
        details: [
          "Founded and launched an e-commerce platform specializing in premium climbing gear and accessories.",
          "Designed and developed product line including chalk bags, chalk buckets, brushes, and training equipment.",
          "Built full e-commerce platform with Shopify integration, payment processing, and inventory management.",
          "Implemented international shipping capabilities supporting both USD and CAD currencies.",
          "Established social media presence across Facebook, Instagram, and TikTok platforms.",
        ],
        link: "https://climbingsesh.com/",
      },
      {
        title: "Keplar",
        role: "Founding Engineer",
        date: "April 2024 - Present",
        details: [
          "Developing a platform for AI-powered audience simulation services.",
        ],
        link: "keplar.io",
      },
      {
        title: "Amazon Lab 126, Astro",
        role: "Senior Software Development Engineer",
        date: "April 2023 - Present",
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
        title: "Amazon Lab 126, Astro",
        role: "Software Development Engineer II",
        date: "April 2020 - April 2023",
        details: [
          "Developed Amazon Astro Robot's core platform and services using C++, Java, Python, Ruby, Javascript, ROS.",
          "Developed novel phone battery notifier feature for Astro.",
          "Created remote device debugging interface with multi-SOC system health monitor.",
          "Created in-house device simulation lab for automated integration testing.",
        ],
      },
      {
        title: "Amazon Lab 126, FireTV",
        role: "Software Development Engineer I",
        date: "August 2018 - April 2020",
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
        role: "Software Development Engineering Intern",
        date: "Sept 2017 - December 2017",
        details: [
          "Developed Amazon Video Application for Echo devices and tablets.",
          "Created production-ready web video application with third-party integrations.",
          "Led development on Zoom Voice Support with NLU and CSM.",
        ],
      },
      {
        title: "Connected Lab",
        role: "Solutions Architect Engineering Intern",
        date: "Jan 2017 - April 2017",
        details: [
          "Implemented programmable chatbot interface using Watson API (NLP).",
          "Prototyped experimental android application with face recognition.",
          "Developed video processing interface using Android NDK.",
        ],
      },
      {
        title: "Connected Lab",
        role: "Software Engineering Intern",
        date: "Jan 2016 - April 2016",
        details: [
          "Built resource allocation tool using ReactJS and Node.",
          "Developed core server functionality with Redux.",
          "Built Jenkins pipeline infrastructure.",
          "Improved unit testing coverage while reducing testing time by 90%.",
        ],
      },
      {
        title: "nanoPay",
        role: "Frontend Developer Intern",
        date: "May 2015 - August 2015",
        details: [
          "Implemented UI/UX of Android app and AngularJS responsive website.",
          "Integrated REST APIs and payment processing systems.",
          "Collaborated with designers to implement high-quality UI components.",
          "Established CI/CD pipeline for automated testing and deployment.",
        ],
      },
    ],
    projects: [
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
        description:
          "Created a virtual simulation environment in Unreal Engine",
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
    ],
    skills: {
      languages: [
        "C++",
        "Java",
        "Python",
        "JavaScript/TypeScript",
        "Kotlin",
        "Go",
      ],
      frontend: ["React", "Next.js", "HTML/CSS", "Tailwind CSS", "Flutter"],
      mobile: ["Android Development", "Native Apps", "Flutter", "Mobile UI/UX"],
      backend: ["Node.js", "Express", "REST APIs", "GraphQL", "Go Services"],
      cloud: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Vertex AI"],
      robotics: [
        "Robot Operating System (ROS)",
        "Computer Vision",
        "Sensor Integration",
        "Motion Planning",
      ],
      ai: [
        "Machine Learning",
        "OpenAI",
        "TogetherAI",
        "Llama Models",
        "VLLM",
        "RAG Systems",
        "LLM Integration",
        "TensorFlow",
        "PyTorch",
      ],
    },
    education: [
      {
        degree: "Bachelor of Computer Engineering",
        school: "University of Waterloo",
        date: "Graduated April 2018",
        details: [
          "Fourth Year Capstone Project: Unreal Sensor Simulation for Autonomous Vehicles — Best Presentation Award",
          "University of Lund; Lund, Sweden — Semester Abroad Fall 2016",
        ],
        pokemon: "alakazam",
      },
      {
        degree: "High School Diploma",
        school: "Pokémon Trainer Academy",
        date: "Graduated June 2014",
        details: ["Grinding experience points"],
        pokemon: "pikachu",
      },
    ],
    portfolio: [
      {
        id: 1,
        name: "Unreal Sensor Simulation",
        image: "/placeholder.svg?height=200&width=200",
        type: "fire",
      },
      {
        id: 2,
        name: "Home.ly",
        image: "/placeholder.svg?height=200&width=200",
        type: "electric",
      },
      {
        id: 3,
        name: "ACNH Data Lookup",
        image: "/placeholder.svg?height=200&width=200",
        type: "grass",
      },
      {
        id: 4,
        name: "Palette",
        image: "/placeholder.svg?height=200&width=200",
        type: "psychic",
      },
    ],
    hobbies: [
      { name: "Gaming", pokemon: "pikachu", type: "electric" },
      { name: "Hiking", pokemon: "bulbasaur", type: "grass" },
      { name: "Cooking", pokemon: "charmander", type: "fire" },
      { name: "Reading", pokemon: "abra", type: "psychic" },
      { name: "Climbing", pokemon: "machamp", type: "fighting" },
      { name: "Traveling", pokemon: "lugia", type: "psychic" },
      { name: "Surfing", pokemon: "lapras", type: "water" },
    ],
  };

  const techStackIcons = {
    unreal: "/placeholder.svg?height=24&width=24",
    cpp: "/placeholder.svg?height=24&width=24",
    python: "/placeholder.svg?height=24&width=24",
    cuda: "/placeholder.svg?height=24&width=24",
    nodejs: "/placeholder.svg?height=24&width=24",
    azure: "/placeholder.svg?height=24&width=24",
    dynamodb: "/placeholder.svg?height=24&width=24",
    react: "/placeholder.svg?height=24&width=24",
    mongodb: "/placeholder.svg?height=24&width=24",
  };

  const getSortedProjects = () => {
    return [...sections.projects].sort((a, b) => {
      const yearA = parseInt(a.year);
      const yearB = parseInt(b.year);
      return projectSortDirection === "desc" ? yearB - yearA : yearA - yearB;
    });
  };

  return (
    <div className="min-h-screen bg-yellow-100 text-black font-mono p-8">
      <header className="text-center mb-8">
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="inline-block"
        >
          <img
            src={pokemonSprite}
            alt="Pokemon Sprite"
            className="w-24 h-24 mx-auto pixelated"
          />
        </motion.div>
        <h1 className="text-4xl font-bold mt-4">Yichen Huang</h1>
        <p className="text-xl mb-4">Software Development Engineer</p>
        <div className="max-w-2xl mx-auto text-center">
          <p className="mb-2">
            Passionate software engineer with expertise in full-stack
            development, IoT, AI, and robotics. Always eager to tackle new
            challenges and innovate in the tech world.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="mailto:yichenhuang95@gmail.com"
              className="flex items-center text-blue-600 hover:underline"
            >
              <Mail className="w-4 h-4 mr-1" />
              yichenhuang95@gmail.com
            </Link>
            <Link
              href="tel:4082163715"
              className="flex items-center text-blue-600 hover:underline"
            >
              <Phone className="w-4 h-4 mr-1" />
              (408) 216-3715
            </Link>
            <Link
              href="https://www.linkedin.com/in/yichenbillhuang/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:underline"
            >
              <Globe className="w-4 h-4 mr-1" />
              LinkedIn
            </Link>
          </div>
        </div>
      </header>

      <nav className="flex justify-center space-x-4 mb-8 flex-wrap">
        {Object.keys(sections).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded ${
              activeSection === section
                ? "bg-red-500 text-white"
                : "bg-white text-red-500"
            } transition-colors duration-200 mb-2`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </nav>

      <main className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
        {activeSection === "experiences" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Briefcase className="mr-2" />
              Experiences
            </h2>
            <div className="relative">
              {sections.experiences.map((exp, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8 relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div className="ml-8 p-4 bg-gray-100 rounded relative">
                    <div className="absolute left-[-2.5rem] top-4 w-5 h-5 bg-red-500 rounded-full"></div>
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
                        <p className="text-sm text-gray-600">{exp.date}</p>
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
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === "projects" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center">
                <Code className="mr-2" />
                Projects
              </h2>
              <button
                onClick={() =>
                  setProjectSortDirection((prev) =>
                    prev === "desc" ? "asc" : "desc"
                  )
                }
                className="text-sm text-red-500 flex items-center"
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
                className="mb-4 p-4 bg-gray-100 rounded"
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg">{project.title}</h3>
                    <span className="text-sm text-gray-600">
                      {project.year}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {project.techStack.map((tech, i) => (
                      <span
                        key={i}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center">
                    <button
                      onClick={() =>
                        setExpandedProject(
                          expandedProject === index ? null : index
                        )
                      }
                      className="text-red-500 flex items-center mr-4"
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
                        className="text-blue-600 hover:underline flex items-center"
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
                      className="mt-2"
                    >
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-40 object-cover rounded-md mb-4"
                      />
                      <p>{project.details}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeSection === "skills" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Star className="mr-2" />
              Skills
            </h2>
            <div className="grid gap-6">
              {Object.entries(sections.skills).map(([category, skillList]) => (
                <motion.div
                  key={category}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gray-100 p-4 rounded-lg"
                >
                  <h3 className="font-bold text-lg mb-2 capitalize">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillList.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === "education" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <GraduationCap className="mr-2" />
              Education
            </h2>
            {sections.education.map((edu, index) => (
              <motion.div
                key={index}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="mb-4 p-4 bg-gray-100 rounded relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{edu.degree}</h3>
                    <p>{edu.school}</p>
                    <p className="text-sm text-gray-600">{edu.date}</p>
                  </div>
                  <img
                    src={getPokemonSprite(edu.pokemon)}
                    alt={`${edu.pokemon} sprite`}
                    className="w-16 h-16 pixelated"
                  />
                </div>
                <button
                  onClick={() =>
                    setExpandedEducation(
                      expandedEducation === index ? null : index
                    )
                  }
                  className="mt-2 text-red-500 flex items-center"
                  aria-expanded={expandedEducation === index}
                  aria-controls={`education-details-${index}`}
                >
                  {expandedEducation === index ? (
                    <>
                      Less info <ChevronUp className="ml-1" />
                    </>
                  ) : (
                    <>
                      More info <ChevronDown className="ml-1" />
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {expandedEducation === index && (
                    <motion.ul
                      id={`education-details-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 list-disc list-inside"
                    >
                      {edu.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeSection === "portfolio" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Image className="mr-2" />
              Portfolio Gallery
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {sections.portfolio.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-100 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-40 object-cover rounded-md mb-2"
                  />
                  <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs text-white ${getTypeColor(
                      project.type
                    )}`}
                  >
                    {project.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === "hobbies" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Heart className="mr-2" />
              Hobbies and Interests
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {sections.hobbies.map((hobby, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-100 p-4 rounded-lg shadow-md flex items-center space-x-4"
                >
                  <img
                    src={getPokemonSprite(hobby.pokemon)}
                    alt={`${hobby.pokemon} sprite`}
                    className="w-16 h-16 pixelated"
                  />
                  <div>
                    <h3 className="font-bold">{hobby.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs text-white ${getTypeColor(
                        hobby.type
                      )}`}
                    >
                      {hobby.type}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      <style jsx>{`
        @keyframes move {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 28px 0;
          }
        }
      `}</style>
    </div>
  );
}
