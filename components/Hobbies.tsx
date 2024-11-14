import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { getPokemonSprite, getTypeColor } from "@/utils/pokemon";

type Hobby = {
  name: string;
  pokemon: string;
  type: string;
};

export const Hobbies = () => {
  const hobbies: Hobby[] = [
    { name: "Gaming", pokemon: "pikachu", type: "electric" },
    { name: "Hiking", pokemon: "bulbasaur", type: "grass" },
    { name: "Cooking", pokemon: "charmander", type: "fire" },
    { name: "Reading", pokemon: "abra", type: "psychic" },
    { name: "Climbing", pokemon: "machamp", type: "fighting" },
    { name: "Traveling", pokemon: "lugia", type: "psychic" },
    { name: "Surfing", pokemon: "lapras", type: "water" },
  ];

  return (
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
        {hobbies.map((hobby, index) => (
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
  );
};
