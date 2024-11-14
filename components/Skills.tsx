import { motion } from "framer-motion";
import { Star } from "lucide-react";

type SkillCategory = {
  [key: string]: string[];
};

export const Skills = () => {
  const skills: SkillCategory = {
    languages: [
      "JavaScript/TypeScript",
      "Java",
      "Python",
      "Kotlin",
      "Go",
      "C++",
      "C#",
      "Dart",
    ],
    frontend: [
      "React",
      "Next.js",
      "HTML/CSS",
      "Tailwind CSS",
      "Flutter",
      "Redux",
      "Sass/SCSS",
      "Three.js",
      "Material-UI",
      "Webpack",
    ],
    mobile: [
      "Native Android Development",
      "Flutter",
      "React Native",
      "iOS Development",
      "Kotlin Multiplatform",
      "Jetpack Compose",
    ],
    backend: [
      "Node.js",
      "Express",
      "REST APIs",
      "GraphQL",
      "Go Services",
      "Spring Boot",
      "NestJS",
      "PostgreSQL",
      "MongoDB",
      "Kafka",
      "Microservices",
      "WebSockets",
      "OAuth/JWT",
    ],
    cloud: [
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Vertex AI",
      "Terraform",
      "Jenkins",
      "GitHub Actions",
      "Grafana",
      "Serverless",
      "CloudFront/CDN",
      "Load Balancing",
      "Auto Scaling",
    ],
    robotics: [
      "Robot Operating System (ROS/ROS2)",
      "Computer Vision",
      "Sensor Integration",
      "Motion/Path Planning",
      "SLAM",
      "Gazebo",
      "OpenCV",
      "Robot Control",
      "Deep Learning for Robotics",
      "Real-time Systems",
      "Embedded Systems",
    ],
    ai: [
      "Machine Learning",
      "OpenAI",
      "TogetherAI",
      "Llama Models",
      "VLLM",
      "RAG Systems",
      "LLM Integration",
      "ElasticSearch",
      "Hugging Face",
      "Reinforcement Learning",
      "Model Deployment",
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800 dark:text-gray-200">
        <Star className="mr-2" />
        Skills
      </h2>
      <div className="grid gap-6">
        {Object.entries(skills).map(([category, skillList]) => (
          <motion.div
            key={category}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-100 dark:bg-gray-900/60 p-4 rounded-lg shadow-md
              border border-transparent dark:border-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-900/80 
              transition-all duration-200"
          >
            <h3 className="font-bold text-lg mb-2 capitalize text-gray-800 dark:text-gray-200">
              {category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {skillList.map((skill, index) => (
                <motion.span
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 
                    px-3 py-1 rounded-full text-sm shadow-sm
                    hover:bg-red-600 dark:hover:bg-red-700 
                    hover:scale-105 transition-all duration-200
                    cursor-default"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
