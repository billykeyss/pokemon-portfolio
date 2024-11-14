import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { getPokemonSprite } from "@/utils/pokemon";

type EducationEntry = {
  degree: string;
  school: string;
  date: string;
  details: string[];
  pokemon: string;
};

export const Education = () => {
  const [expandedEducation, setExpandedEducation] = useState<number | null>(
    null
  );

  const education: EducationEntry[] = [
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
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800 dark:text-gray-200">
        <GraduationCap className="mr-2" />
        Education
      </h2>
      {education.map((edu, index) => (
        <motion.div
          key={index}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="mb-4 p-4 bg-gray-100 dark:bg-gray-900/60 rounded-lg shadow-md relative
            hover:bg-gray-200 dark:hover:bg-gray-900/80 
            border border-transparent dark:border-gray-700
            transition-all duration-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                {edu.degree}
              </h3>
              <p className="text-gray-800 dark:text-gray-200">{edu.school}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {edu.date}
              </p>
              <button
                onClick={() =>
                  setExpandedEducation(
                    expandedEducation === index ? null : index
                  )
                }
                className="mt-2 text-red-500 dark:text-red-400 
                  hover:text-red-600 dark:hover:text-red-300 
                  flex items-center transition-colors
                  focus:outline-none focus:ring-2 
                  focus:ring-red-500 dark:focus:ring-red-400 
                  rounded-md px-2 py-1
                  hover:bg-gray-200 dark:hover:bg-gray-800/60"
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
            </div>
            <img
              src={getPokemonSprite(edu.pokemon)}
              alt={`${edu.pokemon} sprite`}
              className="w-16 h-16 pixelated dark:opacity-90"
            />
          </div>
          <AnimatePresence>
            {expandedEducation === index && (
              <motion.ul
                id={`education-details-${index}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 list-disc list-inside text-gray-700 dark:text-gray-300
                  pl-4 space-y-2"
              >
                {edu.details.map((detail, i) => (
                  <li key={i} className="mt-1">
                    {detail}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  );
};
