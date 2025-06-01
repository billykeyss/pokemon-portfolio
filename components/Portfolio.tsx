import { motion } from "framer-motion";
import { Beaker, Github, ExternalLink, Zap, Users, Star } from "lucide-react";
import { useState } from "react";

type LabExperiment = {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed" | "archived";
  tags: string[];
  metrics?: {
    stars?: number;
    users?: number;
    accuracy?: string;
  };
  links: {
    demo?: string;
    repo?: string;
    paper?: string;
  };
  notes: string;
  image?: string;
  featured: boolean;
};

export const Portfolio = () => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(id)) {
      newFlipped.delete(id);
    } else {
      newFlipped.add(id);
    }
    setFlippedCards(newFlipped);
  };

  const experiments: LabExperiment[] = [
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
  ];

  const featuredExperiments = experiments.filter((exp) => exp.featured);
  const otherExperiments = experiments.filter((exp) => !exp.featured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <Beaker className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
            AI Lab Notebook
          </h2>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Experiments, prototypes, and research in artificial intelligence and
          machine learning. Hover cards to reveal implementation notes and
          insights.
        </p>
      </motion.div>

      {/* Featured Projects */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Featured Experiments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredExperiments.map((experiment, index) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              isFlipped={flippedCards.has(experiment.id)}
              onFlip={() => toggleCard(experiment.id)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Other Projects */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Additional Experiments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherExperiments.map((experiment, index) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              isFlipped={flippedCards.has(experiment.id)}
              onFlip={() => toggleCard(experiment.id)}
              index={index + featuredExperiments.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ExperimentCard = ({
  experiment,
  isFlipped,
  onFlip,
  index,
}: {
  experiment: LabExperiment;
  isFlipped: boolean;
  onFlip: () => void;
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
      }}
      className="group relative h-80 perspective-1000"
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full cursor-pointer preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl 
          bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
          border border-gray-200/50 dark:border-gray-700/50
          shadow-lg shadow-black/5 dark:shadow-black/20
          hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30
          transition-all duration-300 ease-out overflow-hidden"
        >
          {/* Status indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                experiment.status === "active"
                  ? "bg-green-500 animate-pulse"
                  : experiment.status === "completed"
                  ? "bg-blue-500"
                  : "bg-gray-500"
              }`}
            />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
              {experiment.status}
            </span>
          </div>

          {/* Live demo badge */}
          {experiment.links.demo && (
            <div className="absolute top-4 left-4">
              <span
                className="px-2 py-1 text-xs font-bold rounded-full 
                bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm
                animate-pulse"
              >
                LIVE
              </span>
            </div>
          )}

          <div className="p-6 h-full flex flex-col">
            <div className="flex-1">
              <h3
                className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 
                group-hover:text-blue-600 dark:group-hover:text-teal-400 transition-colors"
              >
                {experiment.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                {experiment.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {experiment.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium rounded-lg
                      bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                      border border-gray-200 dark:border-gray-700"
                  >
                    {tag}
                  </span>
                ))}
                {experiment.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    +{experiment.tags.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            {experiment.metrics && (
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                {experiment.metrics.stars && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{experiment.metrics.stars}</span>
                  </div>
                )}
                {experiment.metrics.users && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{experiment.metrics.users}</span>
                  </div>
                )}
                {experiment.metrics.accuracy && (
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span>{experiment.metrics.accuracy}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action links */}
            <div className="flex items-center gap-3">
              {experiment.links.demo && (
                <a
                  href={experiment.links.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-teal-400 
                    hover:text-blue-700 dark:hover:text-teal-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Demo
                </a>
              )}
              {experiment.links.repo && (
                <a
                  href={experiment.links.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 
                    hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Code
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl rotate-y-180
          bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800
          border border-gray-200/50 dark:border-gray-700/50
          shadow-lg shadow-black/5 dark:shadow-black/20"
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-5 h-5 text-purple-500" />
              <h4 className="font-bold text-gray-900 dark:text-gray-100">
                Research Notes
              </h4>
            </div>

            <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {experiment.notes}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Click to flip back
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
