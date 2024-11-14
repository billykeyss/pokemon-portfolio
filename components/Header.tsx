import { motion } from "framer-motion";
import { Mail, Phone, Globe } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export const Header = () => {
  const [pokemonSprite, setPokemonSprite] = useState(
    "/placeholder.svg?height=96&width=96"
  );

  useEffect(() => {
    fetchPokemonSprite();
  }, []);

  const fetchPokemonSprite = async () => {
    try {
      const response = await fetch(
        "https://pokeapi.co/api/v2/pokemon/" + Math.floor(Math.random() * 151)
      );
      const data = await response.json();
      setPokemonSprite(data.sprites.front_default);
    } catch (error) {
      console.error("Failed to fetch Pokemon sprite:", error);
      // Keep the placeholder sprite on error
    }
  };

  return (
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
          Passionate software engineer with expertise in full-stack development,
          IoT, AI, and robotics. Always eager to tackle new challenges and
          innovate in the tech world.
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
  );
};
