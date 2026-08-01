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
}

/** Adding a game here is all it takes to list it on the dashboard. */
export const GAMES: readonly ArcadeGame[] = [
  {
    slug: "bouncedex",
    title: "BOUNCEDEX",
    tagline: "Launch critters. Chain bounces. Defend the nest.",
    href: "/bounce/bouncedex",
    accent: "#F8D030",
    available: true,
  },
  {
    slug: "potion-sort",
    title: "POTION SORT",
    tagline: "Pour the potions. One colour per flask.",
    href: "/sort",
    accent: "#6890F0",
    available: true,
  },
  {
    slug: "traffic",
    title: "TRAFFIC JAM",
    tagline: "Clear the lot. Nobody parks forever.",
    href: "/traffic",
    accent: "#F08030",
    available: true,
  },
  {
    slug: "shelf",
    title: "SHELF SORT",
    tagline: "Stock the shelves. Match the goods.",
    href: "/shelf",
    accent: "#78C850",
    available: true,
  },
  {
    slug: "arrows",
    title: "ARROW ESCAPE",
    tagline: "Read the board. Only the clear ones fly.",
    href: "/arrows",
    accent: "#8FA8F0",
    available: true,
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
];
