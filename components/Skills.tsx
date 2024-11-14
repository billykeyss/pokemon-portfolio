import { motion } from "framer-motion";
import { Star } from "lucide-react";

type SkillCategory = {
  [key: string]: string[];
};

export const Skills = () => {
  const skills: SkillCategory = {
    languages: [
      "C++",
      "Java",
      "Python",
      "JavaScript/TypeScript",
      "Kotlin",
      "Go",
      "Rust",
      "Swift",
      "Ruby",
      "Scala",
      "PHP",
      "C#",
      "Dart",
    ],
    frontend: [
      "React",
      "Next.js",
      "HTML/CSS",
      "Tailwind CSS",
      "Flutter",
      "Vue.js",
      "Angular",
      "Svelte",
      "Redux",
      "Sass/SCSS",
      "WebGL",
      "Three.js",
      "D3.js",
      "Material-UI",
      "Chakra UI",
      "Webpack",
      "Vite",
    ],
    mobile: [
      "Native Android Development",
      "Flutter",
      "React Native",
      "iOS Development",
      "Kotlin Multiplatform",
      "Jetpack Compose",
      "SwiftUI",
      "Xamarin",
      "Progressive Web Apps",
      "Mobile Testing (Appium)",
      "Firebase",
      "App Store Optimization",
    ],
    backend: [
      "Node.js",
      "Express",
      "REST APIs",
      "GraphQL",
      "Go Services",
      "Django",
      "Spring Boot",
      "FastAPI",
      "NestJS",
      "Laravel",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "RabbitMQ",
      "Kafka",
      "gRPC",
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
      "Ansible",
      "Jenkins",
      "GitHub Actions",
      "CircleCI",
      "Prometheus",
      "Grafana",
      "ELK Stack",
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
      "PCL",
      "MoveIt",
      "Navigation Stack",
      "Robot Control",
      "Sensor Fusion",
      "Machine Vision",
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
      "PyTorch",
      "TensorFlow",
      "Scikit-learn",
      "Hugging Face",
      "Computer Vision",
      "NLP",
      "Reinforcement Learning",
      "MLOps",
      "Data Pipeline",
      "Feature Engineering",
      "Model Deployment",
      "Vector Databases",
      "Langchain",
      "Neural Networks",
      "Transfer Learning",
    ],
  };

  return (
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
        {Object.entries(skills).map(([category, skillList]) => (
          <motion.div
            key={category}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-100 p-4 rounded-lg"
          >
            <h3 className="font-bold text-lg mb-2 capitalize">{category}</h3>
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
  );
};
