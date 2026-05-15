import { motion } from "framer-motion";
import { User } from "lucide-react";
import { resumeData } from "@/data/resume-data";

export const AboutMe = () => {
  const personalData = resumeData.personal;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200"
      >
        <User className="mr-3 text-blue-600 dark:text-blue-400" />
        About Me
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-purple-400/30 backdrop-blur-sm"
      >
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
            Hey there! I&apos;m{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {personalData.name}
            </span>
            , a passionate software engineer with 10+ years of experience
            building everything from home robots to AI-powered platforms. When
            I&apos;m not crafting code, you&apos;ll find me scaling rock faces,
            experimenting in the kitchen, or exploring new corners of the world.
          </p>
          <p className="text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            I believe in the intersection of{" "}
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              technology and adventure
            </span>{" "}
            – whether that&apos;s programming autonomous navigation systems for
            robots or founding a climbing gear company. My curiosity drives me
            to constantly learn, create, and push boundaries both in my
            professional work and personal pursuits.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
