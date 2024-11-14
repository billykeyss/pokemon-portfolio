"use client";

import { Education } from "@/components/Education";
import { Experiences } from "@/components/Experiences";
import { Header } from "@/components/Header";
import { Hobbies } from "@/components/Hobbies";
import { Navigation } from "@/components/Navigation";
import { Portfolio } from "@/components/Portfolio";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getRandomPokemonName } from "@/utils/pokemon";
import { useEffect, useState } from "react";

export default function Component() {
  const [activeSection, setActiveSection] = useState("experiences");

  return (
    <div className="min-h-screen bg-yellow-100 dark:bg-gray-900 text-black dark:text-white font-mono p-8 transition-colors duration-200">
      <ThemeToggle />
      <Header />

      <Navigation
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <main className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
        {activeSection === "experiences" && <Experiences />}
        {activeSection === "projects" && <Projects />}
        {activeSection === "skills" && <Skills />}
        {activeSection === "education" && <Education />}
        {activeSection === "portfolio" && <Portfolio />}
        {activeSection === "hobbies" && <Hobbies />}
      </main>
      <style jsx>{`
        @keyframes move {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 28px 0;
          }
        }
      `}</style>
    </div>
  );
}
