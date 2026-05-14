"use client";

import { Education } from "@/components/Education";
import { Experiences } from "@/components/Experiences";
import { Header } from "@/components/Header";
import { Hobbies } from "@/components/Hobbies";
import { Portfolio } from "@/components/Portfolio";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { EightBitBackground } from "@/components/EightBitBackground";
import { Gameboy } from "@/components/Gameboy";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";

export default function Component() {
  const [activeSection, setActiveSection] = useState("experiences");

  // Scroll to section when active section changes
  useEffect(() => {
    const element = document.getElementById(activeSection);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen text-black dark:text-white font-mono p-4 md:p-8 transition-colors duration-200 relative">
      {/* 8-bit background */}
      <EightBitBackground />

      {/* Original Navigation Component */}
      <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />

      <Header />

      <div className="max-w-7xl mx-auto">
        {/* Unified container with shared background */}
        <div className="bg-gradient-to-br from-gray-50/95 to-white/95 dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/30 dark:border-gray-700/30 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            {/* Resume content on the left */}
            <div className="w-full lg:w-2/3 space-y-6">
              <main className="space-y-4">
                <div id="experiences" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Experiences />
                </div>
                
                <div id="projects" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Projects />
                </div>
                
                <div id="skills" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Skills />
                </div>
                
                <div id="education" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Education />
                </div>
                
                <div id="portfolio" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Portfolio />
                </div>
                
                <div id="hobbies" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200/20 dark:border-gray-700/20 shadow-sm hover:shadow-md transition-shadow">
                  <Hobbies />
                </div>
              </main>
            </div>

            {/* Gameboy on the right */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-0 lg:h-screen flex items-center">
              <div className="bg-gradient-to-b from-yellow-50/50 to-green-50/50 dark:from-gray-800/50 dark:to-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 w-full">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Interactive Resume</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Scroll to explore!</p>
                </div>
                <div className="w-full max-w-[400px] mx-auto" style={{ aspectRatio: '2/3' }}>
                  <Gameboy />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
