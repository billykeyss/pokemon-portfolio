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
