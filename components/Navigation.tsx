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
    <nav className="flex justify-center space-x-4 mb-8 flex-wrap">
      {navigationSections.map((section) => (
        <button
          key={section}
          onClick={() => setActiveSection(section)}
          className={`px-4 py-2 rounded ${
            activeSection === section
              ? "bg-red-500 text-white"
              : "bg-white text-red-500"
          } transition-colors duration-200 mb-2`}
        >
          {section.charAt(0).toUpperCase() + section.slice(1)}
        </button>
      ))}
    </nav>
  );
};
