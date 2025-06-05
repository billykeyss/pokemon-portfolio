import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ChevronDown,
  ChevronUp,
  Calendar,
  Trophy,
  Star,
} from "lucide-react";
import { getPokemonSprite, getPokemonSpriteSize } from "@/utils/pokemon";
import { useState } from "react";
import { resumeData, type Hobby } from "@/data/resume-data";

const getTypeColor = (type: string) => {
  const typeColors = resumeData.pokemonTypes;

  return (
    typeColors[type as keyof typeof typeColors] || {
      bg: "#68A090",
      text: "#000",
      gradient: "from-teal-500 to-cyan-600",
      light: "from-teal-100 to-cyan-100",
      dark: "from-teal-900/30 to-cyan-900/30",
    }
  );
};

export const Hobbies = () => {
  const [expandedHobby, setExpandedHobby] = useState<number | null>(null);
  const [hoveredHobby, setHoveredHobby] = useState<number | null>(null);

  const hobbies: Hobby[] = resumeData.hobbies;
  const personalData = resumeData.personal;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Enhanced Header */}
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200"
      >
        <Heart className="mr-3 text-pink-600 dark:text-pink-400" />
        About Me
      </motion.h2>

      {/* Quick About Me Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-purple-400/30 backdrop-blur-sm"
      >
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
            Hey there! I&apos;m{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {personalData.name}
            </span>
            , a passionate software engineer with 9+ years of experience
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

      {/* Hobbies Section Header */}
      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-xl md:text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200"
      >
        My Interests & Hobbies
      </motion.h3>

      {/* Enhanced Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hobbies.map((hobby, index) => {
          const typeColor = getTypeColor(hobby.type);
          const isHovered = hoveredHobby === index;
          const isExpanded = expandedHobby === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer
                bg-gradient-to-br ${typeColor.light} dark:${typeColor.dark}
                border-gray-200/60 dark:border-gray-700/60
                hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30
                ${isExpanded ? "ring-2 ring-offset-2" : ""}
              `}
              style={{
                boxShadow: isHovered
                  ? `0 20px 40px -12px ${typeColor.bg}40`
                  : undefined,
              }}
              onMouseEnter={() => setHoveredHobby(index)}
              onMouseLeave={() => setHoveredHobby(null)}
            >
              {/* Gradient Background Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${typeColor.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              />

              <div className="relative p-4 md:p-6">
                {/* Header Section */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Pokemon Sprite */}
                  <div className="relative flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="relative"
                    >
                      <img
                        src={getPokemonSprite(hobby.pokemon)}
                        alt={`${hobby.pokemon} sprite`}
                        style={{
                          imageRendering: "pixelated",
                          ...getPokemonSpriteSize(hobby.pokemon),
                        }}
                        className="object-contain transition-all duration-200 drop-shadow-lg w-16 h-16 md:w-20 md:h-20"
                      />
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 rounded-full blur-lg opacity-30"
                        style={{ backgroundColor: typeColor.bg }}
                      />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-gray-100">
                        {hobby.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* Type Badge */}
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: typeColor.bg,
                            color: typeColor.text,
                          }}
                        >
                          {hobby.type}
                        </span>
                      </div>
                    </div>

                    {/* Experience Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {hobby.experience}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      {hobby.description}
                    </p>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {hobby.highlights.map((highlight, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + i * 0.1 }}
                          className="flex items-center gap-1 px-3 py-1 bg-white/60 dark:bg-gray-800/60 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50"
                        >
                          <Star className="w-3 h-3" />
                          {highlight}
                        </motion.span>
                      ))}
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() =>
                        setExpandedHobby(isExpanded ? null : index)
                      }
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-lg px-3 py-2 hover:bg-white/50 dark:hover:bg-gray-800/50"
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Learn more <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          Experience & Achievements
                        </h4>
                        <ul className="space-y-2">
                          {hobby.details.map((detail, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                            >
                              <div
                                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                style={{ backgroundColor: typeColor.bg }}
                              />
                              <span className="leading-relaxed">{detail}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
