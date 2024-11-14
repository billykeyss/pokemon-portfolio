import { motion } from "framer-motion";
import { Image } from "lucide-react";
import { getTypeColor } from "@/utils/pokemon";

type PortfolioItem = {
  id: number;
  name: string;
  image: string;
  type: string;
  description?: string;
  link?: string;
};

export const Portfolio = () => {
  const portfolioItems: PortfolioItem[] = [
    {
      id: 1,
      name: "Unreal Sensor Simulation",
      image: "/placeholder.svg?height=200&width=200",
      type: "fire",
      description: "Virtual simulation environment in Unreal Engine",
      link: "https://example.com/unreal-simulation",
    },
    {
      id: 2,
      name: "Home.ly",
      image: "/placeholder.svg?height=200&width=200",
      type: "electric",
      description: "Smart home automation platform",
      link: "https://example.com/homely",
    },
    {
      id: 3,
      name: "ACNH Data Lookup",
      image: "/placeholder.svg?height=200&width=200",
      type: "grass",
      description: "Animal Crossing New Horizons database",
      link: "https://example.com/acnh",
    },
    {
      id: 4,
      name: "Palette",
      image: "/placeholder.svg?height=200&width=200",
      type: "psychic",
      description: "Color palette generator",
      link: "https://example.com/palette",
    },
  ];

  return (
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
        {portfolioItems.map((project) => (
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
            {project.description && (
              <p className="text-sm text-gray-600 mb-2">
                {project.description}
              </p>
            )}
            <div className="flex justify-between items-center">
              <span
                className={`inline-block px-2 py-1 rounded text-xs text-white ${getTypeColor(
                  project.type
                )}`}
              >
                {project.type}
              </span>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  View Project →
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
