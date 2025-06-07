// Type definitions for resume data
export interface PersonalInfo {
  name: string;
  title: string;
  bio: {
    intro: string;
    philosophy: string;
  };
}

export interface Experience {
  title: string;
  timelineTitle: string;
  role: string;
  startDate: string;
  endDate: string;
  highlight: string;
  details: string[];
  link?: string;
}

export interface EducationItem {
  degree: string;
  school: string;
  date: string;
  details?: string[];
  pokemon: string;
}

export interface Hobby {
  name: string;
  pokemon: string;
  type: string;
  description: string;
  experience: string;
  details: string[];
  highlights: string[];
}

export interface SkillCategory {
  title: string;
  description: string;
  color: string;
  darkColor: string;
  skills: string[];
}

export interface CoreSkill {
  name: string;
  category: string;
  proficiency: number;
  description: string;
}

export interface Project {
  title: string;
  description: string;
  year: string;
  category: string;
  featured?: boolean;
  award?: string;
  details: string;
  link?: string;
  image?: string;
  techStack: string[];
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed";
  tags: string[];
  metrics: Record<string, string | number>;
  links: Record<string, string>;
  notes: string;
  featured: boolean;
}

export interface PokemonType {
  bg: string;
  text: string;
  gradient: string;
  light: string;
  dark: string;
}

export interface ResumeData {
  personal: PersonalInfo;
  experiences: Experience[];
  education: EducationItem[];
  hobbies: Hobby[];
  skillCategories: SkillCategory[];
  coreSkills: CoreSkill[];
  projects: Project[];
  portfolio: PortfolioItem[];
  pokemonTypes: Record<string, PokemonType>;
}

// Resume data with proper TypeScript types
export const resumeData: ResumeData = {
  personal: {
    name: "Bill",
    title: "Software Engineering & Leadership",
    bio: {
      intro:
        "Hey there! I'm Bill, a passionate software engineer with 9+ years of experience building everything from home robots to AI-powered platforms. When I'm not crafting code, you'll find me scaling rock faces, experimenting in the kitchen, or exploring new corners of the world.",
      philosophy:
        "I believe in the intersection of technology and adventure – whether that's programming autonomous navigation systems for robots or founding a climbing gear company. My curiosity drives me to constantly learn, create, and push boundaries both in my professional work and personal pursuits.",
    },
  },
  experiences: [
    {
      title: "Keplar.io",
      timelineTitle: "Keplar.io",
      role: "Founding Engineer",
      startDate: "2024-04",
      endDate: "Present",
      highlight:
        "Building AI-powered audience simulation platform using LLMs and RAG to accelerate enterprise product feedback cycles by 95%",
      details: [
        "As a founding engineer, I lead development of Keplar's audience simulation platform from concept to production, leveraging state-of-the-art LLMs, RAG, and agentic architectures. Built robust, scalable infrastructure for AI-driven user feedback simulations across a modern SaaS stack (TypeScript, Node.js, Temporal, Elasticsearch, PostgreSQL).",
        "Architected and launched an agentic simulation engine using the Observe-Reflect-Act (ORA) paradigm, enabling lifelike, context-aware synthetic audience feedback for enterprise clients.",
        "Designed and deployed vector based Retrieval-Augmented Generation (RAG) pipelines to ground LLM outputs in proprietary user data, increasing relevance and accuracy of simulated feedback by over 60%.",
        "Implemented vector embedding and semantic search using Elasticsearch, enabling instant retrieval of audience segments and real-time scenario benchmarking; supported 25,000+ unique synthetic audience profiles at scale.",
        "Integrated Multi-Context Protocols (MCP) for advanced context switching and memory in simulated agents, enhancing simulation fidelity and product test coverage.",
        "Reduced traditional product feedback cycles by up to 95%, accelerating enterprise customer time-to-insight from weeks to hours.",
      ],
      link: "https://www.keplar.io/",
    },
    {
      title: "Sesh",
      timelineTitle: "Sesh",
      role: "Founder",
      startDate: "2022-10",
      endDate: "Present",
      highlight:
        "Founded and scaled premium climbing gear D2C brand from concept to 4.8⭐ rating, 3k+ social followers, and 14% conversion rate",
      details: [
        "Launched Sesh Climbing (climbingsesh.com), a direct-to-consumer brand for premium climbing gear—from concept and naming to Shopify storefront, 3PL workflows, and multi-currency checkout in USD & CAD.",
        "Designed and released a 10-SKU product line including chalk buckets, modular chalk bags, boar-hair brushes, 3D-printed training blocks, and pure magnesium-carbonate chalk, all produced with local suppliers and in-house additive manufacturing.",
        "Maintained a 4.8-star-plus customer rating across the store, with the flagship BOLDER SESH chalk bucket earning a 4.86/5 average from 14 verified reviews.",
        "Secured partnerships with six regional climbing gyms to host pop-up events, doubling the email list and driving 30% month-over-month revenue lifts during campaign weeks.",
        "Built an end-to-end commerce stack—Shopify Liquid customizations, Klaviyo automations, Stripe & Shop Pay integration, and Pirate Ship for cross-border fulfillment—cutting average dispatch time to 48 hours and keeping returns under 1%.",
        "Grew social presence from zero to 3k+ followers in six months on Instagram, TikTok, and Facebook through product-demo reels and user-generated content challenges, reaching 150k organic impressions per quarter.",
        "Led brand identity and packaging design (logo, print collateral, unboxing experience), boosting on-site conversion to 14% and enabling repeat-purchase email flows that now account for 25% of revenue.",
      ],
      link: "https://climbingsesh.com/",
    },
    {
      title: "V12 Resole",
      timelineTitle: "V12 Resole",
      role: "CTO (Consultant → Full-time)",
      startDate: "2023-10",
      endDate: "Present",
      highlight:
        "Leading tech transformation for climbing service company: built smart IoT drop-box, AI training portal, and 3x throughput platform",
      details: [
        "Transitioned from technical consultant to CTO, leading full-stack development and hardware engineering initiatives for a climbing shoe resole service.",
        "Engineered an end-to-end Resole Service Management (RSM) platform in Node.js + TypeScript (NX monorepo), React, PostgreSQL, and Docker, integrating Square & Shopify POS APIs for order intake, invoicing, and inventory sync. → 65% cut in manual admin time and 3× order-throughput capacity without extra head-count.",
        'Designed a 24/7 "Smart Drop-Box" for contact-free pick-up/drop-off: Raspberry Pi + GPIO-controlled electronic lock, QR-code reader, LCD, and an Express/Tailscale VPN backend for secure remote updates. → 28% growth in monthly shoe intakes and lost-item rate < 1%.',
        "Built a real-time production dashboard (React Flow + MUI) with drag-and-drop Kanban stages, barcode scanning, and live metrics. → 50% reduction in workshop search time and <5 min average status update latency.",
        'Authored a TypeScript "SquareService" SDK wrapping 14 critical endpoints (orders, payments, customers) and a Shopify webhook processor; now drives 100% of financial transactions with < 0.2% sync errors.',
        "Launched an AI-powered cobbler training portal (OpenAI GPT based RAG over internal videos & SOPs) that auto-generates step-by-step repair guidance and quizzes. → On-the-tools proficiency time cut from 6 weeks to 2 weeks for new hires.",
        "Implemented CI/CD on Render with blue-green deploys; maintains 99.9% uptime and < 5 min rollback windows.",
      ],
      link: "https://www.v12resole.com/",
    },
    {
      title: "Amazon Lab 126, Astro",
      timelineTitle: "Astro",
      role: "Senior Software Development Engineer",
      startDate: "2022-04",
      endDate: "2024-03",
      highlight:
        "Led core robotics systems for Amazon's home robot: autonomous navigation, computer vision, and 95%+ person recognition accuracy",
      details: [
        "Led end-to-end development of Astro's autonomous navigation and mapping systems, integrating SLAM algorithms with real-time obstacle detection to enable seamless home exploration across 15+ room configurations.",
        "Architected and deployed Astro's computer vision pipeline for person recognition and tracking, combining RGB-D sensors with machine learning models to achieve 95%+ accuracy in family member identification.",
        "Spearheaded cross-functional collaboration with hardware, AI/ML, and UX teams to deliver 8 major consumer-facing features, including Smart Alerts, Ring Guard integration, and Drop-In functionality for remote home monitoring.",
        "Built comprehensive robotics testing infrastructure with Hardware-in-the-Loop simulation, reducing physical testing time by 70% and enabling parallel validation across 50+ home environment scenarios.",
        "Mentored and onboarded 12 engineers across consumer development teams, establishing best practices for robotics software development and distributed system integration in resource-constrained embedded environments.",
        "Engineered real-time sensor fusion systems combining LiDAR, cameras, IMU, and wheel encoders using ROS2, C++, and custom Android services to enable precise indoor localization with sub-meter accuracy.",
        "Optimized Astro's behavioral state machine and motion planning algorithms, reducing response latency by 40% and improving battery efficiency by 25% through intelligent power management across multiple SOCs.",
        "Implemented robust integration testing framework with automated CI/CD pipelines, achieving 99.5% test coverage across the full Android AOSP stack from kernel drivers to system applications.",
      ],
      link: "https://www.aboutamazon.com/news/devices/meet-astro",
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineer II",
      startDate: "2020-04",
      endDate: "2022-03",
      highlight:
        "Developed Astro Robot's core platform and innovative features including phone battery notifications and multi-SOC debugging",
      details: [
        "Developed Amazon Astro Robot's core platform and services using C++, Java, Python, Ruby, Javascript, ROS.",
        "Developed novel phone battery notifier feature for Astro.",
        "Created remote device debugging interface with multi-SOC system health monitor.",
        "Created in-house device simulation lab for automated integration testing.",
      ],
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineer I",
      startDate: "2018-08",
      endDate: "2020-03",
      highlight:
        "Architected and delivered FireTV news application supporting 11 platforms and 3000 TPS with 60% latency improvements",
      details: [
        "Led development on FireTV news application, creating system architecture.",
        "Engineered high-performing application for 11 FireTV platforms.",
        "Provided 24-hour operational support for service hitting 3000 TPS.",
        "Reduced p50 cold start latency by 25% and p90 by 60%.",
      ],
      link: "https://amazonfiretv.blog/introducing-the-news-app-on-fire-tv-5138d80a8dc9",
    },
    {
      title: "Amazon Lab 126, FireTV",
      timelineTitle: "FireTV",
      role: "Software Development Engineering Intern",
      startDate: "2017-08",
      endDate: "2017-12",
      highlight:
        "Built production-ready Amazon Video app for Echo devices with voice support and third-party integrations",
      details: [
        "Developed Amazon Video Application for Echo devices and tablets.",
        "Created production-ready web video application with third-party integrations.",
        "Led development on Zoom Voice Support with NLU and CSM.",
      ],
    },
    {
      title: "Connected Lab",
      timelineTitle: "Connected",
      role: "Solutions Architect Engineering Intern",
      startDate: "2017-01",
      endDate: "2017-05",
      highlight:
        "Prototyped AI-powered chatbot with Watson NLP and experimental Android face recognition application",
      details: [
        "Implemented programmable chatbot interface using Watson API (NLP).",
        "Prototyped experimental android application with face recognition.",
        "Developed video processing interface using Android NDK.",
      ],
    },
    {
      title: "Connected Lab",
      timelineTitle: "Connected",
      role: "Software Engineering Intern",
      startDate: "2016-01",
      endDate: "2016-05",
      highlight:
        "Built React/Node resource allocation tool with Redux architecture and 90% testing time reduction via Jenkins CI/CD",
      details: [
        "Built resource allocation tool using ReactJS and Node.",
        "Developed core server functionality with Redux.",
        "Built Jenkins pipeline infrastructure.",
        "Improved unit testing coverage while reducing testing time by 90%.",
      ],
    },
    {
      title: "nanoPay",
      timelineTitle: "nanoPay",
      role: "Frontend Developer Intern",
      startDate: "2015-05",
      endDate: "2015-09",
      highlight:
        "Developed responsive AngularJS fintech application with payment processing integration and automated CI/CD pipeline",
      details: [
        "Implemented UI/UX of Android app and AngularJS responsive website.",
        "Integrated REST APIs and payment processing systems.",
        "Collaborated with designers to implement high-quality UI components.",
        "Established CI/CD pipeline for automated testing and deployment.",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Computer Engineering",
      school: "University of Waterloo",
      date: "Graduated April 2018",
      details: [
        "Fourth Year Capstone Project: Unreal Sensor Simulation for Autonomous Vehicles — Best Presentation Award",
        "University of Lund; Lund, Sweden — Semester Abroad Fall 2016",
      ],
      pokemon: "alakazam",
    },
    {
      degree: "High School Diploma",
      school: "Pokémon Trainer Academy",
      date: "Graduated June 2013",
      details: ["Grinding experience points"],
      pokemon: "pikachu",
    },
  ],
  hobbies: [
    {
      name: "Gaming",
      pokemon: "pikachu",
      type: "electric",
      description:
        "Passionate about competitive esports, indie games, and the latest AAA titles.",
      experience: "15+ years",
      details: [
        "Competitive FPS gaming with tournament experience in Counter-Strike and Valorant",
        "Indie game enthusiast, particularly drawn to innovative gameplay mechanics and storytelling",
        "Console and PC gaming across multiple genres including RPGs, strategy, and simulation games",
        "Active in gaming communities and forums, sharing reviews and gameplay strategies",
      ],
      highlights: [
        "Tournament Top 16",
        "2000+ hours in various titles",
        "Game dev hobbyist",
      ],
    },
    {
      name: "Rock Climbing",
      pokemon: "machamp",
      type: "fighting",
      description:
        "Passionate climber scaling both indoor walls and outdoor crags worldwide.",
      experience: "8+ years",
      details: [
        "Outdoor sport climbing and bouldering across North America and Europe",
        "Indoor gym climbing with consistent V6-V8 boulder grade sends",
        "Founded Sesh Climbing gear company, designing and manufacturing climbing accessories",
        "Active in local climbing communities, organizing group trips and teaching beginners",
        "Focus on sustainable climbing practices and Leave No Trace principles",
      ],
      highlights: [
        "V8 boulder sends",
        "Founded climbing company",
        "30+ crags climbed",
      ],
    },
    {
      name: "Cooking",
      pokemon: "charmander",
      type: "fire",
      description:
        "Culinary enthusiast exploring international cuisines and molecular gastronomy.",
      experience: "10+ years",
      details: [
        "Specialized in Asian fusion cuisine, particularly Japanese and Korean techniques",
        "Molecular gastronomy experiments with spherification and liquid nitrogen",
        "Sourdough bread baking with wild yeast cultivation and fermentation science",
        "Farm-to-table cooking using locally sourced ingredients and seasonal menus",
        "Wine and sake pairing knowledge with completed sommelier courses",
      ],
      highlights: [
        "Michelin-inspired dishes",
        "Perfect sourdough",
        "Molecular techniques",
      ],
    },
    {
      name: "Reading",
      pokemon: "abra",
      type: "psychic",
      description:
        "Voracious reader across sci-fi, technical literature, and philosophy.",
      experience: "Lifelong",
      details: [
        "Science fiction and speculative fiction, particularly hard sci-fi and cyberpunk genres",
        "Technical books on software engineering, AI/ML, and emerging technologies",
        "Philosophy and cognitive science, exploring consciousness and human-AI interaction",
        "Biographies of innovators and entrepreneurs in technology and science",
        "Active participant in book clubs and online literary discussions",
      ],
      highlights: ["200+ books/year", "Philosophy focus", "Sci-fi collector"],
    },
    {
      name: "Traveling",
      pokemon: "lugia",
      type: "psychic",
      description:
        "World explorer seeking authentic cultural experiences and natural wonders.",
      experience: "20+ countries",
      details: [
        "Cultural immersion trips focusing on local traditions, languages, and customs",
        "Adventure travel including hiking, climbing, and outdoor exploration",
        "Photography expeditions capturing landscapes, street scenes, and architectural details",
        "Culinary tourism, learning regional cooking techniques and ingredients",
        "Solo backpacking through Europe, Asia, and North America with minimal planning",
      ],
      highlights: ["5 continents", "Solo adventures", "Cultural immersion"],
    },
    {
      name: "Photography",
      pokemon: "bulbasaur",
      type: "grass",
      description:
        "Capturing moments through landscape, street, and adventure photography.",
      experience: "12+ years",
      details: [
        "Landscape photography with focus on golden hour and blue hour compositions",
        "Street photography in urban environments, documenting daily life and culture",
        "Adventure and climbing photography, capturing action and outdoor experiences",
        "Drone photography for aerial perspectives and unique viewpoints",
        "Film photography using vintage cameras and developing techniques",
      ],
      highlights: ["Published works", "Drone certified", "Film development"],
    },
    {
      name: "Surfing",
      pokemon: "lapras",
      type: "water",
      description: "Ocean enthusiast riding waves along coastlines worldwide.",
      experience: "6+ years",
      details: [
        "Surfing breaks across California, Hawaii, and international destinations",
        "Longboard and shortboard riding in various wave conditions",
        "Ocean conservation advocacy and beach cleanup participation",
        "Surf photography and videography to document sessions and conditions",
        "Teaching beginners proper surf etiquette and safety practices",
      ],
      highlights: [
        "Hawaii pipeline",
        "Conservation advocate",
        "Multi-board rider",
      ],
    },
    {
      name: "Music Production",
      pokemon: "jigglypuff",
      type: "normal",
      description: "Electronic music creation and sound design exploration.",
      experience: "5+ years",
      details: [
        "Digital Audio Workstation (DAW) proficiency in Ableton Live and Logic Pro",
        "Synthesizer programming and sound design using hardware and software synths",
        "Beat making and rhythm programming across various electronic genres",
        "Field recording for ambient textures and unique sound sources",
        "Collaboration with local artists and producers on creative projects",
      ],
      highlights: ["Released tracks", "Hardware synths", "Sound design"],
    },
  ],
  skillCategories: [
    {
      title: "AI & Machine Learning",
      description: "Building human-centered AI systems",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      darkColor: "dark:from-purple-400 dark:to-pink-400",
      skills: [
        "OpenAI GPT-4",
        "TogetherAI",
        "Llama Models",
        "VLLM",
        "RAG Systems",
        "LLM Integration",
        "ElasticSearch",
        "Hugging Face",
        "Vector Databases",
        "Reinforcement Learning",
        "Model Deployment",
        "Prompt Engineering",
      ],
    },
    {
      title: "Frontend Development",
      description: "Modern, responsive user interfaces",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
      darkColor: "dark:from-blue-400 dark:to-cyan-400",
      skills: [
        "React",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "Framer Motion",
        "Three.js",
        "WebGL",
        "Redux Toolkit",
        "React Query",
        "Vite",
        "Webpack",
        "Sass/SCSS",
      ],
    },
    {
      title: "Backend & APIs",
      description: "Scalable server architectures",
      color: "bg-gradient-to-br from-green-500 to-emerald-500",
      darkColor: "dark:from-green-400 dark:to-emerald-400",
      skills: [
        "Node.js",
        "Python FastAPI",
        "Go Services",
        "GraphQL",
        "REST APIs",
        "PostgreSQL",
        "MongoDB",
        "Redis",
        "Apache Kafka",
        "Microservices",
        "WebSockets",
        "OAuth/JWT",
      ],
    },
    {
      title: "Cloud & DevOps",
      description: "Infrastructure & deployment",
      color: "bg-gradient-to-br from-orange-500 to-red-500",
      darkColor: "dark:from-orange-400 dark:to-red-400",
      skills: [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "Terraform",
        "GitHub Actions",
        "Jenkins",
        "Grafana",
        "Prometheus",
        "Serverless",
        "CDN/CloudFront",
      ],
    },
    {
      title: "Mobile Development",
      description: "Cross-platform mobile apps",
      color: "bg-gradient-to-br from-indigo-500 to-purple-500",
      darkColor: "dark:from-indigo-400 dark:to-purple-400",
      skills: [
        "Flutter",
        "React Native",
        "Kotlin",
        "Swift",
        "Jetpack Compose",
        "SwiftUI",
        "Native Android",
        "iOS Development",
        "Kotlin Multiplatform",
        "Expo",
      ],
    },
    {
      title: "Robotics & IoT",
      description: "Autonomous systems & sensors",
      color: "bg-gradient-to-br from-teal-500 to-green-500",
      darkColor: "dark:from-teal-400 dark:to-green-400",
      skills: [
        "ROS/ROS2",
        "Computer Vision",
        "OpenCV",
        "SLAM",
        "Path Planning",
        "Sensor Fusion",
        "Real-time Systems",
        "Embedded C++",
        "Arduino",
        "Raspberry Pi",
        "Gazebo",
      ],
    },
  ],
  coreSkills: [
    {
      name: "OpenAI GPT-4 Integration",
      category: "AI",
      proficiency: 5,
      description: "Production LLM applications",
    },
    {
      name: "React & Next.js",
      category: "Frontend",
      proficiency: 5,
      description: "Modern component architectures",
    },
    {
      name: "Node.js & TypeScript",
      category: "Backend",
      proficiency: 5,
      description: "Scalable server applications",
    },
    {
      name: "AWS & Cloud Architecture",
      category: "Cloud",
      proficiency: 4,
      description: "Distributed systems design",
    },
    {
      name: "Python & FastAPI",
      category: "Backend",
      proficiency: 4,
      description: "API development and ML integration",
    },
    {
      name: "RAG & Vector Databases",
      category: "AI",
      proficiency: 4,
      description: "Context-aware AI systems",
    },
    {
      name: "PostgreSQL & MongoDB",
      category: "Backend",
      proficiency: 4,
      description: "Database design and optimization",
    },
    {
      name: "Docker & Kubernetes",
      category: "Cloud",
      proficiency: 4,
      description: "Containerization and orchestration",
    },
  ],
  projects: [
    {
      title: "Tahoe Snow Conditions",
      description:
        "Real-time ski resort conditions tracker for California and BC/Alberta",
      year: "2024",
      category: "web",
      featured: true,
      details:
        "A comprehensive ski conditions monitoring platform that aggregates real-time data from ski resorts across California and British Columbia/Alberta. Features live snow reports, weather conditions, trail status, and lift operations. Built with modern web technologies to provide skiers and snowboarders with up-to-date resort information for trip planning.",
      link: "https://tahoesno.onrender.com/",
      image: "/projects/tahoe-snow.png",
      techStack: [
        "React",
        "Node.js",
        "Weather API",
        "Resort APIs",
        "TypeScript",
        "Tailwind CSS",
      ],
    },
    {
      title: "Mushroom Weather Dashboard",
      description:
        "Weather analysis tool for mushroom foraging with interactive mapping",
      year: "2024",
      category: "web",
      featured: true,
      details:
        "Developed an interactive weather dashboard that helps foragers determine potential mushroom locations based on historical and forecasted weather conditions. Users can select locations via map interface or coordinates to analyze 10-day historical and future weather patterns optimal for mushroom growth.",
      link: "https://mushroom-weather.s3.us-west-2.amazonaws.com/index.html",
      image: "/projects/mushroom-weather.png",
      techStack: [
        "React",
        "AWS S3",
        "Weather API",
        "Mapbox",
        "TypeScript",
        "Tailwind CSS",
      ],
    },
    {
      title: "Unreal Sensor Simulation",
      description:
        "Virtual simulation environment with custom sensor configurations",
      year: "2018",
      category: "ai",
      featured: true,
      award: "Best Presentation Award - $1000",
      details:
        "Architected and implemented a flexible sensor configuration system in a virtual environment, empowering users to customize their experience with an unlimited number of camera and lidar sensors. Won Best Presentation Award and $1000 cash prize.",
      link: "https://example.com/unreal-sensor-simulation",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Unreal Engine", "C++", "Python", "CUDA"],
    },
    {
      title: "Home.ly",
      description: "IoT wireless ad-hoc network for smart home monitoring",
      year: "2017",
      category: "iot",
      featured: true,
      details:
        "Developed an IoT system that monitors the ambient environment of separate rooms in your home. Equipped with a microphone array to track snoring patterns and humidity sensors to monitor house plants. Built with Microsoft Azure IoT Hub, NodeJS, DynamoDB, and hosted on Azure Web services.",
      link: "https://github.com/billykeyss/home.ly",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Node.js", "Azure IoT", "DynamoDB", "React"],
    },
    {
      title: "Animal Crossing Market Predictor",
      description: "ML-powered game data analysis and prediction platform",
      year: "2020",
      category: "ai",
      details:
        "Created a comprehensive platform for Animal Crossing New Horizons data analysis, including price prediction algorithms, market trend analysis, and availability forecasting for bugs, fish, and turnip prices.",
      link: "https://acnh.s3.us-west-2.amazonaws.com/index.html",
      image: "/projects/acnh.png",
      techStack: ["React", "Node.js", "MongoDB", "Python", "ML Models"],
    },
    {
      title: "Palette",
      description: "AI-powered color palette extraction from camera feed",
      year: "2019",
      category: "mobile",
      details:
        "Analyzes an image/camera feed and extracts a custom color palette from it using advanced computer vision algorithms. Developed using Kotlin on Android, implementing modern best practices for MVVM Architecture and using Room database to cache data and maintain history.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: [
        "Kotlin",
        "Android",
        "MVVM",
        "Room DB",
        "Camera API",
        "Computer Vision",
      ],
    },
    {
      title: "RapBot",
      description: "Alexa rapping skill with dynamic lyrics generation",
      year: "2017",
      category: "ai",
      award: "Hackathon Winner - $250",
      details:
        "Developed a rapping skill for the Alexa voice interface at Amazon x Connected Lab hackathon. Features dynamic rap generation and rhythm matching. Won best hack and $250 Prize.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["AWS Lambda", "S3", "Alexa Skills Kit", "Node.js", "NLP"],
    },
    {
      title: "TapExchange",
      description: "NFC-based contact exchange mobile application",
      year: "2016",
      category: "mobile",
      details:
        "Developed an Android Application that uses NFC to allow users to exchange contact information by tapping their phones together. Implemented secure transfer of contact information and NFC methods.",
      image: "/placeholder.svg?height=200&width=300",
      techStack: ["Android", "Java", "NFC API", "Contacts API"],
    },
    {
      title: "Casty",
      description: "Household movie queue and streaming platform",
      year: "2018",
      category: "iot",
      details:
        "A household movie queue and streaming device built for the Raspberry Pi, enabling local media streaming, queue management, and multi-user controls.",
      image: "/projects/casty.png",
      techStack: ["Node.js", "Raspberry Pi", "React", "Express", "WebRTC"],
    },
    {
      title: "Pong Neural Network",
      description: "AI-enhanced classic game with reinforcement learning",
      year: "2016",
      category: "game",
      details:
        "A modern recreation of the classic game of Pong using Unity game engine, featuring AI opponents trained with reinforcement learning and adaptive difficulty.",
      image: "/projects/pong.png",
      techStack: ["Unity", "C#", "ML-Agents", "Reinforcement Learning"],
    },
  ],
  portfolio: [
    {
      id: "neural-renderer",
      title: "Neural 3D Renderer",
      description:
        "Real-time neural rendering with Unreal Engine integration for photorealistic simulations",
      status: "active",
      tags: [
        "Computer Vision",
        "Unreal Engine",
        "Neural Networks",
        "Real-time",
      ],
      metrics: { stars: 234, users: 1200, accuracy: "94.2%" },
      links: {
        demo: "https://neural-render-demo.example.com",
        repo: "https://github.com/yichen/neural-renderer",
      },
      notes:
        "Exploring novel view synthesis with NeRF variants. Current focus on optimizing for real-time performance in simulation environments.",
      featured: true,
    },
    {
      id: "smart-home-ai",
      title: "Home.ly AI Assistant",
      description:
        "Contextual AI for smart home automation with natural language processing",
      status: "completed",
      tags: ["NLP", "IoT", "Smart Home", "Voice AI"],
      metrics: { users: 5600, stars: 89 },
      links: {
        demo: "https://homely-demo.example.com",
        repo: "https://github.com/yichen/homely",
      },
      notes:
        "Deployed multimodal AI that learns user preferences and automates home devices. Achieved 89% user satisfaction in beta testing.",
      featured: true,
    },
    {
      id: "acnh-predictor",
      title: "ACNH Market Predictor",
      description:
        "ML model predicting Animal Crossing market trends with 92% accuracy",
      status: "completed",
      tags: ["Time Series", "Prediction", "Gaming", "React"],
      metrics: { users: 12000, accuracy: "92%" },
      links: {
        demo: "https://acnh-predictor.example.com",
        repo: "https://github.com/yichen/acnh-predictor",
      },
      notes:
        "Time series analysis of in-game economics. Used LSTM networks to predict turnip prices and rare item availability.",
      featured: false,
    },
    {
      id: "color-harmony",
      title: "AI Color Harmonizer",
      description:
        "Generative color palette tool using perceptual color space analysis",
      status: "active",
      tags: ["Generative AI", "Design Tools", "Color Theory", "Web App"],
      metrics: { users: 3400, stars: 156 },
      links: {
        demo: "https://color-harmony.example.com",
        repo: "https://github.com/yichen/color-harmony",
      },
      notes:
        "Exploring perceptually uniform color spaces and aesthetic harmony rules. Integrating with design workflows.",
      featured: false,
    },
    {
      id: "rag-explorer",
      title: "RAG System Explorer",
      description:
        "Interactive platform for experimenting with different RAG architectures",
      status: "active",
      tags: ["RAG", "LLMs", "Vector DB", "Embeddings"],
      metrics: { stars: 445, users: 890 },
      links: {
        repo: "https://github.com/yichen/rag-explorer",
        demo: "https://rag-explorer.example.com",
      },
      notes:
        "Comparative analysis of retrieval strategies. Testing hybrid dense/sparse retrieval with different embedding models.",
      featured: true,
    },
    {
      id: "temporal-reasoning",
      title: "Temporal LLM Reasoning",
      description:
        "Research on temporal understanding in large language models",
      status: "active",
      tags: ["Research", "Temporal AI", "LLMs", "Benchmarking"],
      metrics: { accuracy: "87.3%" },
      links: {
        paper: "https://arxiv.org/example",
        repo: "https://github.com/yichen/temporal-llm",
      },
      notes:
        "Investigating how LLMs handle temporal relationships and causal reasoning. Developing new evaluation benchmarks.",
      featured: true,
    },
  ],
  pokemonTypes: {
    normal: {
      bg: "#A8A878",
      text: "#000",
      gradient: "from-gray-400 to-gray-600",
      light: "from-gray-100 to-gray-200",
      dark: "from-gray-900/30 to-gray-800/30",
    },
    fire: {
      bg: "#F08030",
      text: "#fff",
      gradient: "from-red-500 to-orange-600",
      light: "from-red-100 to-orange-100",
      dark: "from-red-900/30 to-orange-900/30",
    },
    water: {
      bg: "#6890F0",
      text: "#fff",
      gradient: "from-blue-500 to-cyan-600",
      light: "from-blue-100 to-cyan-100",
      dark: "from-blue-900/30 to-cyan-900/30",
    },
    electric: {
      bg: "#F8D030",
      text: "#000",
      gradient: "from-yellow-400 to-amber-500",
      light: "from-yellow-100 to-amber-100",
      dark: "from-yellow-900/30 to-amber-900/30",
    },
    grass: {
      bg: "#78C850",
      text: "#000",
      gradient: "from-green-500 to-emerald-600",
      light: "from-green-100 to-emerald-100",
      dark: "from-green-900/30 to-emerald-900/30",
    },
    fighting: {
      bg: "#C03028",
      text: "#fff",
      gradient: "from-red-600 to-red-800",
      light: "from-red-100 to-red-200",
      dark: "from-red-900/30 to-red-800/30",
    },
    psychic: {
      bg: "#F85888",
      text: "#fff",
      gradient: "from-pink-500 to-purple-600",
      light: "from-pink-100 to-purple-100",
      dark: "from-pink-900/30 to-purple-900/30",
    },
    flying: {
      bg: "#A890F0",
      text: "#000",
      gradient: "from-indigo-400 to-purple-500",
      light: "from-indigo-100 to-purple-100",
      dark: "from-indigo-900/30 to-purple-900/30",
    },
  },
};

export default resumeData;
