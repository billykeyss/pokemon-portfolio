import { motion } from "framer-motion";
import { Globe, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";

export const Header = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [dpadDirection, setDpadDirection] = useState<string | null>(null);
  const { theme } = useTheme();

  return (
    <header className="text-center mb-8 w-full max-w-4xl mx-auto px-4">
      {/* Rest of header content */}
      <h1 className="text-2xl md:text-4xl font-bold mt-4">Yichen Huang</h1>
      <p className="text-lg md:text-xl mb-4">Software Development Engineer</p>
      <div className="max-w-2xl mx-auto text-center px-4">
        <p className="mb-2 text-sm md:text-base">
          Passionate software engineer with expertise in full-stack development,
          IoT, AI, and robotics. Always eager to tackle new challenges and
          innovate in the tech world.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
          <Link
            href="mailto:yichenhuang95@gmail.com"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Mail className="w-4 h-4 mr-1" />
            yichenhuang95@gmail.com
          </Link>
          <Link
            href="tel:4082163715"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Phone className="w-4 h-4 mr-1" />
            (408) 216-3715
          </Link>
          <Link
            href="https://www.linkedin.com/in/yichenbillhuang/"
            target="_blank"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Globe className="w-4 h-4 mr-1" />
            LinkedIn
          </Link>
        </div>
      </div>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="relative w-full aspect-[2/1] max-w-[600px] mx-auto"
        onClick={() => setIsPlaying(!isPlaying)}
        style={{ cursor: "pointer" }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 250 150"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Body with rounded corners */}
          <rect
            x="10"
            y="10"
            width="250"
            height="130"
            rx="15"
            fill="#013598"
            className="dark:opacity-90"
          />
          <rect
            x="15"
            y="15"
            width="240"
            height="120"
            rx="12"
            fill="#002A88"
            className="dark:opacity-90"
          />

          {/* Screen bezel - centered and taller */}
          <rect x="60" y="20" width="140" height="95" rx="4" fill="#1A1B1E" />

          {/* Screen frame */}
          <rect
            x="65"
            y="25"
            width="130"
            height="85"
            fill={theme === "dark" ? "#1A1B1E" : "#232323"}
          />

          {/* Screen Container */}
          <foreignObject x="70" y="30" width="120" height="75">
            <div className="w-full h-full relative overflow-hidden rounded">
              {isPlaying ? (
                <video
                  key={isPlaying ? "playing" : "stopped"}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain pixelated bg-[#565656]"
                >
                  <source src="/pokemon-red-start.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full bg-[#565656]" />
              )}
            </div>
          </foreignObject>

          {/* D-Pad - adjusted for centered screen */}
          <g transform="translate(30, 55)">
            {/* D-pad base/shadow */}
            <path
              d="M0 4h12v12h12v12h-12v12h-12v-12h-12v-12h12v-12z"
              fill="#1a1a1a"
            />
            {/* D-pad main cross */}
            <path
              d="M1 5h11v11h11v11h-11v11h-11v-11h-11v-11h11v-11z"
              fill={dpadDirection ? "#A0A0A0" : "#D0D0D0"}
            />
            {/* D-pad center piece */}
            <rect x="3" y="17" width="8" height="8" fill="#B0B0B0" />
            {/* D-pad directional indicators */}
            <path d="M6.5 7l3 3h-6l3-3z" fill="#9a9a9a" /> {/* Up */}
            <path d="M6.5 32l3-3h-6l3 3z" fill="#9a9a9a" /> {/* Down */}
            <path d="M19 21l-3 3v-6l3 3z" fill="#9a9a9a" /> {/* Right */}
            <path d="M-7 21l3 3v-6l-3 3z" fill="#9a9a9a" /> {/* Left */}
          </g>

          {/* A/B Buttons - adjusted for centered screen */}
          <g transform="translate(240, 75)">
            <circle cx="0" cy="0" r="10" fill="#A93671" />
            <text x="-3" y="3" fill="white" fontSize="8">
              A
            </text>
          </g>
          <g transform="translate(217, 85)">
            <circle cx="0" cy="0" r="10" fill="#A93671" />
            <text x="-3" y="3" fill="white" fontSize="8">
              B
            </text>
          </g>

          {/* Start/Select buttons */}
          <g transform="translate(110, 125)">
            <rect x="0" y="0" width="20" height="6" rx="3" fill="#D0D0D0" />
            <rect x="25" y="0" width="20" height="6" rx="3" fill="#D0D0D0" />
            <text x="3" y="-2" fill="#697796" fontSize="4">
              SELECT
            </text>
            <text x="30" y="-2" fill="#697796" fontSize="4">
              START
            </text>
          </g>

          {/* Power LED */}
          <motion.circle
            cx="25"
            cy="25"
            r="3"
            fill="#FF0000"
            animate={
              isPlaying
                ? {
                    opacity: [1, 0.5, 1],
                    fill: ["#FF0000", "#FF6B6B", "#FF0000"],
                  }
                : {
                    opacity: 0.5,
                    fill: "#570000",
                  }
            }
            transition={{
              duration: 2,
              repeat: isPlaying ? Infinity : 0,
              ease: "linear",
            }}
          />
          {/* Speaker grills */}
          <g transform="translate(230, 115)">
            <rect x="0" y="0" width="3" height="10" fill="#002A88" />
            <rect x="6" y="0" width="3" height="10" fill="#002A88" />
            <rect x="12" y="0" width="3" height="10" fill="#002A88" />
          </g>
          {/* Nintendo text */}
          <text
            x="20"
            y="135"
            fill="#697796"
            fontSize="5"
            style={{ fontFamily: "monospace" }}
          >
            Nintendo GAME BOY advance
          </text>
        </svg>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500"
        >
          Click to {isPlaying ? "stop" : "start"}
        </motion.div>
      </motion.div>
    </header>
  );
};
