import { levelProgress, waveProgress, type ProgressSource } from "./progress";

export interface ArcadeGame {
  /** Stable id — used as a React key, never as a route fragment. */
  slug: string;
  title: string;
  tagline: string;
  /**
   * Where the cabinet leads. An absolute path for games in this app, or a full
   * URL for one that lives elsewhere — games are not confined to one origin,
   * let alone one URL prefix.
   */
  href: string;
  /** Hex colour for the cabinet accent. */
  accent: string;
  available: boolean;
  /** Where this cabinet reports your progress from, if it keeps any. */
  progress?: ProgressSource;
}

/** Adding a game here is all it takes to list it on the dashboard. */
export const GAMES: readonly ArcadeGame[] = [
  {
    slug: "bouncedex",
    title: "BOUNCEDEX",
    tagline: "Launch critters. Chain the bounces.",
    href: "/bounce/bouncedex",
    accent: "#F8D030",
    available: true,
    progress: waveProgress("bounce:bouncedex"),
  },
  {
    slug: "potion-sort",
    title: "POTION SORT",
    tagline: "Pour the potions. One colour per flask.",
    href: "/sort",
    accent: "#6890F0",
    available: true,
    progress: levelProgress("game:sort"),
  },
  {
    slug: "traffic",
    title: "TRAFFIC JAM",
    tagline: "Clear the lot. Nobody parks forever.",
    href: "/traffic",
    accent: "#F08030",
    available: true,
    progress: levelProgress("game:traffic"),
  },
  {
    slug: "shelf",
    title: "SHELF SORT",
    tagline: "Stock the shelves. Match the goods.",
    href: "/shelf",
    accent: "#78C850",
    available: true,
    progress: levelProgress("game:shelf"),
  },
  {
    slug: "arrows",
    title: "ARROW ESCAPE",
    tagline: "Read the board. Only the clear ones fly.",
    href: "/arrows",
    accent: "#8FA8F0",
    available: true,
    progress: levelProgress("game:arrows"),
  },
  {
    slug: "chronicle",
    title: "CHRONICLES",
    tagline: "Place events on the timeline. Three strikes.",
    href: "https://chronicle.billhuang.me/",
    accent: "#C9A227",
    available: true,
  },
  {
    slug: "critter-knight",
    title: "CRITTER KNIGHT",
    tagline: "Drag to move. Stop to swing.",
    href: "/knight",
    accent: "#E05050",
    available: true,
  },
  {
    slug: "sudoku",
    title: "SUDOKU",
    tagline: "Notes write themselves. Hints explain.",
    href: "/sudoku",
    accent: "#A890F0",
    available: true,
    // Sudoku has no level and no best wave, so neither shared factory applies.
    // The key is written as a literal, like every other cabinet's, rather than
    // imported from the game — the registry should not depend on a game's
    // internals to render a dashboard row.
    progress: {
      key: "game:sudoku",
      summarize(save) {
        if (typeof save !== "object" || save === null) return null;
        const stats = (save as { stats?: unknown }).stats;
        if (typeof stats !== "object" || stats === null) return null;

        let solved = 0;
        for (const entry of Object.values(stats as Record<string, unknown>)) {
          const n = (entry as { solved?: unknown } | null)?.solved;
          if (typeof n === "number" && Number.isFinite(n) && n > 0) {
            solved += Math.floor(n);
          }
        }
        return solved > 0 ? `${solved} solved` : null;
      },
    },
  },
  {
    slug: "picross",
    title: "PICROSS",
    tagline: "Read the numbers. Find the picture.",
    href: "/picross",
    accent: "#3B7DD8",
    available: true,
    progress: levelProgress("game:picross"),
  },
];
