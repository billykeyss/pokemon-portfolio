import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  Bot,
  Brain,
  Cloud,
  Code,
  Database,
  Smartphone,
  Zap,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

type SkillCategory = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  skills: string[];
  color: string;
  darkColor: string;
};

type CoreSkill = {
  name: string;
  category: "AI" | "Frontend" | "Backend" | "Cloud";
  proficiency: number; // 1-5 scale
  description: string;
};

export const Skills = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const animatedWords = [
    "LLMs",
    "RAG",
    "Vector DBs",
    "Temporal",
    "Neural Networks",
    "Transformers",
  ];

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % animatedWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const controls = animate(count, 50, { duration: 2 });
    return controls.stop;
  }, []);

  const coreSkills: CoreSkill[] = [
    {
      name: "LLM Integration",
      category: "AI",
      proficiency: 5,
      description:
        "Advanced prompt engineering, fine-tuning, and API integration",
    },
    {
      name: "RAG Systems & Vector Databases",
      category: "AI",
      proficiency: 5,
      description:
        "Building intelligent retrieval systems with ElasticSearch, Pinecone",
    },
    {
      name: "React & Next.js",
      category: "Frontend",
      proficiency: 5,
      description: "Modern React patterns, SSR, and performance optimization",
    },
    {
      name: "TypeScript & JavaScript",
      category: "Frontend",
      proficiency: 5,
      description: "Type-safe development and advanced JS patterns",
    },
    {
      name: "Node.js & Python FastAPI",
      category: "Backend",
      proficiency: 5,
      description: "Scalable backend services and API development",
    },
    {
      name: "PostgreSQL & MongoDB",
      category: "Backend",
      proficiency: 4,
      description: "Database design, optimization, and management",
    },
    {
      name: "AWS & Cloud Architecture",
      category: "Cloud",
      proficiency: 4,
      description: "Serverless, containers, and scalable cloud solutions",
    },
    {
      name: "Docker & Kubernetes",
      category: "Cloud",
      proficiency: 4,
      description: "Containerization and orchestration",
    },
  ];

  const skillCategories: SkillCategory[] = [
    {
      icon: Brain,
      title: "AI & Machine Learning",
      description: "Building human-centered AI systems",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      darkColor: "dark:from-purple-400 dark:to-pink-400",
      skills: [
        "OpenAI GPT-4",
        "TogetherAI",
        "Llama Models",
        "VLLM",
        "RAG Systems",
        "LLM Integration",
        "ElasticSearch",
        "Hugging Face",
        "Vector Databases",
        "Reinforcement Learning",
        "Model Deployment",
        "Prompt Engineering",
      ],
    },
    {
      icon: Code,
      title: "Frontend Development",
      description: "Modern, responsive user interfaces",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
      darkColor: "dark:from-blue-400 dark:to-cyan-400",
      skills: [
        "React",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Framer Motion",
        "Three.js",
        "WebGL",
        "Redux Toolkit",
        "React Query",
        "Vite",
        "Webpack",
        "Sass/SCSS",
      ],
    },
    {
      icon: Database,
      title: "Backend & APIs",
      description: "Scalable server architectures",
      color: "bg-gradient-to-br from-green-500 to-emerald-500",
      darkColor: "dark:from-green-400 dark:to-emerald-400",
      skills: [
        "Node.js",
        "Python FastAPI",
        "Go Services",
        "GraphQL",
        "REST APIs",
        "PostgreSQL",
        "MongoDB",
        "Redis",
        "Apache Kafka",
        "Microservices",
        "WebSockets",
        "OAuth/JWT",
      ],
    },
    {
      icon: Cloud,
      title: "Cloud & DevOps",
      description: "Infrastructure & deployment",
      color: "bg-gradient-to-br from-orange-500 to-red-500",
      darkColor: "dark:from-orange-400 dark:to-red-400",
      skills: [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "Terraform",
        "GitHub Actions",
        "Jenkins",
        "Grafana",
        "Prometheus",
        "Serverless",
        "CDN/CloudFront",
      ],
    },
    {
      icon: Smartphone,
      title: "Mobile Development",
      description: "Cross-platform mobile apps",
      color: "bg-gradient-to-br from-indigo-500 to-purple-500",
      darkColor: "dark:from-indigo-400 dark:to-purple-400",
      skills: [
        "Flutter",
        "React Native",
        "Kotlin",
        "Swift",
        "Jetpack Compose",
        "SwiftUI",
        "Native Android",
        "iOS Development",
        "Kotlin Multiplatform",
        "Expo",
      ],
    },
    {
      icon: Bot,
      title: "Robotics & IoT",
      description: "Autonomous systems & sensors",
      color: "bg-gradient-to-br from-teal-500 to-green-500",
      darkColor: "dark:from-teal-400 dark:to-green-400",
      skills: [
        "ROS/ROS2",
        "Computer Vision",
        "OpenCV",
        "SLAM",
        "Path Planning",
        "Sensor Fusion",
        "Real-time Systems",
        "Embedded C++",
        "Arduino",
        "Raspberry Pi",
        "Gazebo",
      ],
    },
  ];

  const getCategoryColor = (category: CoreSkill["category"]) => {
    switch (category) {
      case "AI":
        return "from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400";
      case "Frontend":
        return "from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400";
      case "Backend":
        return "from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400";
      case "Cloud":
        return "from-orange-500 to-red-500 dark:from-orange-400 dark:to-red-400";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section with Animated Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Building with{" "}
            <span className="relative inline-block">
              <motion.span
                key={currentWordIndex}
                initial={{ opacity: 0, y: 20, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, rotateX: 90 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="inline-block bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:to-teal-400 
                  bg-clip-text text-transparent font-extrabold"
              >
                {animatedWords[currentWordIndex]}
              </motion.span>
            </span>
          </h2>

          {/* Neural network background pattern */}
          <div className="absolute inset-0 -z-10 opacity-30">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
              w-96 h-96 bg-gradient-radial from-blue-500/20 via-purple-500/10 to-transparent 
              dark:from-teal-500/20 dark:via-blue-500/10 dark:to-transparent rounded-full blur-3xl"
            />
          </div>
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Passionate about creating intelligent systems that enhance human
          capabilities. Specializing in AI, full-stack development, and
          cutting-edge technology.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="font-mono">
              <motion.span>{rounded}</motion.span>+ Technologies
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <span>AI-First Approach</span>
          </div>
        </div>
      </motion.div>

      {/* Core Expertise Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Star className="w-6 h-6 text-yellow-500" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Core Expertise
            </h3>
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            My primary focus areas where I deliver the most impact
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreSkills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="group relative overflow-hidden rounded-xl 
                bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
                border border-gray-200/50 dark:border-gray-700/50
                shadow-lg shadow-black/5 dark:shadow-black/20
                hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30
                transition-all duration-300 ease-out p-5"
            >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full text-white
                  bg-gradient-to-r ${getCategoryColor(skill.category)}`}
                >
                  {skill.category}
                </span>

                {/* Proficiency stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < skill.proficiency
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Skill content */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {skill.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {skill.description}
                </p>
              </div>

              {/* Hover gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${getCategoryColor(
                  skill.category
                )} 
                opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl`}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* All Skills Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Complete Technology Stack
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Full range of technologies and frameworks I work with
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.6 + index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl 
                  bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                  border border-gray-200/50 dark:border-gray-700/50
                  shadow-lg shadow-black/5 dark:shadow-black/20
                  hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30
                  transition-all duration-300 ease-out"
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 ${category.color} ${category.darkColor} 
                  opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Content */}
                <div className="relative p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl ${category.color} ${category.darkColor} shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {category.skills.slice(0, 6).map((skill, skillIndex) => (
                        <motion.span
                          key={skill}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: 0.6 + index * 0.1 + skillIndex * 0.05,
                            type: "spring",
                            stiffness: 200,
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg
                            bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                            border border-gray-200 dark:border-gray-700
                            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          {skill}
                        </motion.span>
                      ))}
                      {category.skills.length > 6 && (
                        <span
                          className="px-3 py-1.5 text-xs font-medium rounded-lg
                          text-gray-500 dark:text-gray-400 italic"
                        >
                          +{category.skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover border effect */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-transparent 
                  group-hover:border-gray-300 dark:group-hover:border-gray-600 
                  transition-colors duration-300"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
