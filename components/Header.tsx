import { motion } from "framer-motion";
import { Globe, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";

export const Header = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const { theme } = useTheme();

  return (
    <header className="text-center mb-8 w-full max-w-4xl mx-auto px-4">
      {/* Rest of header content */}
      <h1 className="text-2xl md:text-4xl font-bold mt-4">
        Bill (Yichen) Huang
      </h1>
      <p className="text-lg md:text-xl mb-4">AI Focused Software Engineer</p>
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
        className="relative w-full aspect-[2/3] max-w-[400px] mx-auto"
        onClick={() => setIsPlaying(!isPlaying)}
        style={{ cursor: "pointer" }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 200 300"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Body - Classic Game Boy style */}
          <rect
            x="10"
            y="10"
            width="180"
            height="280"
            rx="20"
            fill="#D4D4AA"
            className="dark:opacity-90"
          />
          <rect
            x="15"
            y="15"
            width="170"
            height="270"
            rx="15"
            fill="#E8E8C0"
            className="dark:opacity-90"
          />

          {/* Top bezel/border */}
          <rect x="20" y="20" width="160" height="15" rx="3" fill="#B8B8A0" />

          {/* Screen bezel - classic Game Boy position */}
          <rect x="40" y="45" width="120" height="90" rx="8" fill="#1A1B1E" />

          {/* Screen frame */}
          <rect
            x="45"
            y="50"
            width="110"
            height="80"
            fill={theme === "dark" ? "#1A1B1E" : "#232323"}
          />

          {/* Screen Container */}
          <foreignObject x="50" y="55" width="100" height="70">
            <div className="w-full h-full relative overflow-hidden rounded">
              {isPlaying ? (
                <video
                  key={isPlaying ? "playing" : "stopped"}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain pixelated bg-[#9BBB0F]"
                  style={{
                    filter:
                      "sepia(1) hue-rotate(60deg) saturate(2) contrast(1.2)",
                  }}
                >
                  <source src="/pokemon-red-start.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full bg-[#9BBB0F]" />
              )}
            </div>
          </foreignObject>

          {/* Power LED */}
          <motion.circle
            cx="165"
            cy="55"
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

          {/* Power text */}
          <text x="165" y="75" fill="#808080" fontSize="6" textAnchor="middle">
            POWER
          </text>

          {/* Speaker grills - top of device */}
          <g transform="translate(70, 25)">
            <rect x="0" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="4" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="8" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="12" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="16" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="20" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="24" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="28" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="32" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="36" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="40" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="44" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="48" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="52" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="56" y="0" width="2" height="8" fill="#A0A090" />
            <rect x="60" y="0" width="2" height="8" fill="#A0A090" />
          </g>

          {/* Nintendo text above screen */}
          <text
            x="100"
            y="145"
            fill="#666666"
            fontSize="8"
            textAnchor="middle"
            style={{ fontFamily: "sans-serif", fontWeight: "normal" }}
          >
            Nintendo
          </text>

          {/* Game Boy text above screen */}
          <text
            x="100"
            y="155"
            fill="#333333"
            fontSize="12"
            textAnchor="middle"
            style={{ fontFamily: "sans-serif", fontWeight: "bold" }}
          >
            GAME BOY
          </text>

          {/* D-Pad - positioned on bottom left */}
          <g transform="translate(55, 190)">
            {/* D-pad base/shadow */}
            <path
              d="M0 4h12v12h12v12h-12v12h-12v-12h-12v-12h12v-12z"
              fill="#A0A090"
            />
            {/* D-pad main cross */}
            <path
              d="M1 5h11v11h11v11h-11v11h-11v-11h-11v-11h11v-11z"
              fill="#D0D0C0"
            />
            {/* D-pad center piece */}
            <rect x="6" y="17" width="6" height="6" fill="#B8B8A8" />
          </g>

          {/* A/B Buttons - positioned on bottom right */}
          <g transform="translate(130, 200)">
            <circle cx="0" cy="0" r="12" fill="#A0A090" />
            <circle cx="0" cy="0" r="10" fill="#D0D0C0" />
            <text
              x="0"
              y="3"
              fill="#666666"
              fontSize="8"
              textAnchor="middle"
              fontWeight="bold"
            >
              A
            </text>
          </g>
          <g transform="translate(110, 220)">
            <circle cx="0" cy="0" r="12" fill="#A0A090" />
            <circle cx="0" cy="0" r="10" fill="#D0D0C0" />
            <text
              x="0"
              y="3"
              fill="#666666"
              fontSize="8"
              textAnchor="middle"
              fontWeight="bold"
            >
              B
            </text>
          </g>

          {/* Start/Select buttons - bottom center */}
          <g transform="translate(75, 255)">
            <rect x="0" y="0" width="20" height="8" rx="4" fill="#B8B8A8" />
            <rect x="30" y="0" width="20" height="8" rx="4" fill="#B8B8A8" />
            <text x="10" y="12" fill="#666666" fontSize="5" textAnchor="middle">
              SELECT
            </text>
            <text x="40" y="12" fill="#666666" fontSize="5" textAnchor="middle">
              START
            </text>
          </g>

          {/* Bottom Nintendo branding */}
          <text
            x="100"
            y="280"
            fill="#999999"
            fontSize="6"
            textAnchor="middle"
            style={{ fontFamily: "monospace" }}
          >
            Nintendo GAME BOY TM
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
