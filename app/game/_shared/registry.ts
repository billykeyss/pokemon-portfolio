export interface ArcadeGame {
  /** Stable id — used as a React key, never as a route fragment. */
  slug: string;
  title: string;
  tagline: string;
  /** Absolute route. Games are not confined to any one URL prefix. */
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
];
