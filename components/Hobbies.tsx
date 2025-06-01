import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Box, Typography, Chip } from "@mui/material";
import { getPokemonSprite } from "@/utils/pokemon";

type Hobby = {
  name: string;
  pokemon: string;
  type: string;
};

const getTypeColor = (type: string) => {
  const typeColors = {
    normal: { bg: "#A8A878", text: "#000" },
    fire: { bg: "#F08030", text: "#fff" },
    water: { bg: "#6890F0", text: "#fff" },
    electric: { bg: "#F8D030", text: "#000" },
    grass: { bg: "#78C850", text: "#000" },
    ice: { bg: "#98D8D8", text: "#000" },
    fighting: { bg: "#C03028", text: "#fff" },
    poison: { bg: "#A040A0", text: "#fff" },
    ground: { bg: "#E0C068", text: "#000" },
    flying: { bg: "#A890F0", text: "#000" },
    psychic: { bg: "#F85888", text: "#fff" },
    bug: { bg: "#A8B820", text: "#000" },
    rock: { bg: "#B8A038", text: "#000" },
    ghost: { bg: "#705898", text: "#fff" },
    dragon: { bg: "#7038F8", text: "#fff" },
    dark: { bg: "#705848", text: "#fff" },
    steel: { bg: "#B8B8D0", text: "#000" },
    fairy: { bg: "#EE99AC", text: "#000" },
  };

  return (
    typeColors[type as keyof typeof typeColors] || {
      bg: "#68A090",
      text: "#000",
    }
  );
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
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Heart style={{ marginRight: 8 }} />
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bold" }}>
          Hobbies and Interests
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
        }}
      >
        {hobbies.map((hobby, index) => {
          const typeColor = getTypeColor(hobby.type);

          return (
            <Box
              key={index}
              component={motion.div}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 2,
                boxShadow: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "grey.800" : "grey.100",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "grey.700" : "grey.200",
                  transform: "scale(1.02)",
                },
              }}
            >
              <Box
                component="img"
                src={getPokemonSprite(hobby.pokemon)}
                alt={`${hobby.pokemon} sprite`}
                sx={{
                  width: 64,
                  height: 64,
                  imageRendering: "pixelated",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    fontWeight: "bold",
                    mb: 1,
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "common.white"
                        : "common.black",
                  }}
                >
                  {hobby.name}
                </Typography>
                <Chip
                  label={hobby.type}
                  size="small"
                  sx={{
                    bgcolor: typeColor.bg,
                    color: typeColor.text,
                    fontWeight: "bold",
                    fontSize: { xs: "0.625rem", md: "0.75rem" },
                    textTransform: "capitalize",
                    "&:hover": {
                      bgcolor: typeColor.bg,
                      filter: "brightness(1.1)",
                    },
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
