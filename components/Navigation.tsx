type NavigationProps = {
  activeSection: string;
  setActiveSection: (id: string) => void;
};

export const navigationSections = [
  "experiences",
  "projects",
  "skills",
  "education",
  "portfolio",
  "hobbies",
] as const;

export type NavigationSection = (typeof navigationSections)[number];

export const Navigation = ({
  activeSection,
  setActiveSection,
}: NavigationProps) => {
  return (
    <nav className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl mx-auto">
      <div className="flex flex-wrap gap-2 justify-center">
        {navigationSections.map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-lg transition-colors duration-200
              ${
                activeSection === section
                  ? "bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 shadow-md"
                  : "bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
              }
              border-2 border-transparent hover:border-red-500 dark:hover:border-red-400
              focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400
              font-medium text-sm md:text-base`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>
    </nav>
  );
};
