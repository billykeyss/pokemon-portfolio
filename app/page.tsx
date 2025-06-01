"use client";

import { Education } from "@/components/Education";
import { Experiences } from "@/components/Experiences";
import { Header } from "@/components/Header";
import { Hobbies } from "@/components/Hobbies";
import { Navigation } from "@/components/Navigation";
import { Portfolio } from "@/components/Portfolio";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { useState, useEffect } from "react";

export default function Component() {
  const [activeSection, setActiveSection] = useState("experiences");

  // Sync activeSection with URL hash
  useEffect(() => {
    // Function to update active section based on hash
    const updateSectionFromHash = () => {
      const hash = window.location.hash.slice(1); // Remove the # symbol
      const validSections = [
        "experiences",
        "projects",
        "skills",
        "education",
        "portfolio",
        "hobbies",
      ];

      if (hash && validSections.includes(hash)) {
        setActiveSection(hash);
      } else if (!hash) {
        // Default to experiences if no hash
        setActiveSection("experiences");
        window.history.replaceState(null, "", "#experiences");
      }
    };

    // Set initial section from URL hash
    updateSectionFromHash();

    // Listen for hash changes (back/forward navigation)
    const handleHashChange = () => {
      updateSectionFromHash();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Custom setActiveSection that updates both state and URL
  const handleSetActiveSection = (section: string) => {
    setActiveSection(section);
    window.history.pushState(null, "", `#${section}`);
  };

  return (
    <div className="min-h-screen bg-yellow-100 dark:bg-gray-900 text-black dark:text-white font-mono p-8 transition-colors duration-200">
      <Header />

      <Navigation
        activeSection={activeSection}
        setActiveSection={handleSetActiveSection}
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
