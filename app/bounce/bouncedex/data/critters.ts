export type BehaviorTag =
  | "standard"
  | "heavy"
  | "light"
  | "sticky"
  | "splitter"
  | "ghost"
  | "magnet"
  | "bomb";

export interface CritterDef {
  id: string;
  name: string;
  /** Short glyph used in compact UI; the canvas draws from `color`. */
  glyph: string;
  color: string;
  behavior: BehaviorTag;
  mass: number;
  radius: number;
  restitution: number;
  damage: number;
  stage: 1 | 2;
  /** Two branch forms, or null for stage-2 forms. One evolution per critter. */
  evolvesTo: readonly [string, string] | null;
}

/** Damage events a settled critter must deal before it may evolve. */
export const EVOLVE_HIT_THRESHOLD = 8;

type BaseSpec = Omit<CritterDef, "stage" | "evolvesTo">;
type BranchSpec = Partial<Omit<CritterDef, "stage" | "evolvesTo">> &
  Pick<CritterDef, "id" | "name">;

/** Evolved forms are declared as deltas off their base to keep tuning readable. */
function line(base: BaseSpec, a: BranchSpec, b: BranchSpec): CritterDef[] {
  const branch = (spec: BranchSpec): CritterDef => ({
    ...base,
    ...spec,
    stage: 2,
    evolvesTo: null,
  });
  return [
    { ...base, stage: 1, evolvesTo: [a.id, b.id] as const },
    branch(a),
    branch(b),
  ];
}

const LINES: CritterDef[][] = [
  line(
    { id: "ember", name: "Ember", glyph: "🔥", color: "#F08030", behavior: "standard", mass: 1, radius: 13, restitution: 0.82, damage: 6 },
    { id: "blaze", name: "Blaze", glyph: "🔥", color: "#E0501A", damage: 11, behavior: "sticky" },
    { id: "cinder", name: "Cinder", glyph: "✨", color: "#FFA24C", damage: 9, behavior: "splitter" },
  ),
  line(
    { id: "boulder", name: "Boulder", glyph: "🪨", color: "#8A7A66", behavior: "heavy", mass: 3.2, radius: 17, restitution: 0.35, damage: 10 },
    { id: "monolith", name: "Monolith", glyph: "⛰️", color: "#6B5D4C", damage: 17, mass: 4.2, radius: 19 },
    { id: "avalanche", name: "Avalanche", glyph: "🏔️", color: "#A89880", damage: 14, behavior: "splitter", mass: 2.8 },
  ),
  line(
    { id: "pip", name: "Pip", glyph: "⚪", color: "#EDEDED", behavior: "light", mass: 0.5, radius: 9, restitution: 0.97, damage: 3 },
    { id: "ricochet", name: "Ricochet", glyph: "💫", color: "#D8F0FF", damage: 5, restitution: 0.99 },
    { id: "flicker", name: "Flicker", glyph: "⚡", color: "#FFF6A8", damage: 6, behavior: "ghost" },
  ),
  line(
    { id: "gloop", name: "Gloop", glyph: "🟢", color: "#7BC96F", behavior: "sticky", mass: 1.2, radius: 14, restitution: 0.4, damage: 5 },
    { id: "tarpit", name: "Tarpit", glyph: "⚫", color: "#3D3B3A", damage: 9, mass: 1.8 },
    { id: "bloom", name: "Bloom", glyph: "🌸", color: "#F7A8C4", damage: 8, behavior: "bomb" },
  ),
  line(
    { id: "sprout", name: "Sprout", glyph: "🌿", color: "#78C850", behavior: "standard", mass: 1, radius: 13, restitution: 0.8, damage: 6 },
    { id: "bramble", name: "Bramble", glyph: "🌾", color: "#5A9B38", damage: 10, behavior: "sticky" },
    { id: "thorn", name: "Thorn", glyph: "🌵", color: "#93D66B", damage: 9, behavior: "splitter" },
  ),
  line(
    { id: "droplet", name: "Droplet", glyph: "💧", color: "#6890F0", behavior: "standard", mass: 0.9, radius: 12, restitution: 0.9, damage: 5 },
    { id: "torrent", name: "Torrent", glyph: "🌊", color: "#3A63C8", damage: 9, mass: 1.6 },
    { id: "mist", name: "Mist", glyph: "🌫️", color: "#A8C4F0", damage: 7, behavior: "ghost" },
  ),
  line(
    { id: "spark", name: "Spark", glyph: "⚡", color: "#F8D030", behavior: "light", mass: 0.6, radius: 10, restitution: 0.95, damage: 4 },
    { id: "arc", name: "Arc", glyph: "🌩️", color: "#E8B800", damage: 8, behavior: "magnet" },
    { id: "surge", name: "Surge", glyph: "💥", color: "#FFE873", damage: 7, behavior: "bomb" },
  ),
  line(
    { id: "wisp", name: "Wisp", glyph: "👻", color: "#B39CD9", behavior: "ghost", mass: 0.8, radius: 12, restitution: 0.88, damage: 5 },
    { id: "phantom", name: "Phantom", glyph: "🎭", color: "#8A6FC4", damage: 9 },
    { id: "shade", name: "Shade", glyph: "🌑", color: "#5D4A85", damage: 8, behavior: "sticky" },
  ),
  line(
    { id: "lodestone", name: "Lodestone", glyph: "🧲", color: "#C05050", behavior: "magnet", mass: 1.4, radius: 14, restitution: 0.6, damage: 6 },
    { id: "polaris", name: "Polaris", glyph: "⭐", color: "#E86A6A", damage: 11 },
    { id: "vortex", name: "Vortex", glyph: "🌀", color: "#9B3F3F", damage: 10, behavior: "bomb" },
  ),
  line(
    { id: "kernel", name: "Kernel", glyph: "🌰", color: "#C4894A", behavior: "splitter", mass: 1.1, radius: 12, restitution: 0.75, damage: 4 },
    { id: "shrapnel", name: "Shrapnel", glyph: "🔩", color: "#9A6A33", damage: 7 },
    { id: "cluster", name: "Cluster", glyph: "🍇", color: "#A76FC4", damage: 6, behavior: "bomb" },
  ),
  line(
    { id: "fuse", name: "Fuse", glyph: "💣", color: "#4A4A4A", behavior: "bomb", mass: 1.5, radius: 14, restitution: 0.5, damage: 5 },
    { id: "detonator", name: "Detonator", glyph: "🧨", color: "#D63A2F", damage: 12 },
    { id: "mortar", name: "Mortar", glyph: "🎇", color: "#6F6F6F", damage: 10, behavior: "heavy", mass: 2.6 },
  ),
  line(
    { id: "shell", name: "Shell", glyph: "🐚", color: "#E8C9A0", behavior: "heavy", mass: 2.4, radius: 16, restitution: 0.45, damage: 8 },
    { id: "bulwark", name: "Bulwark", glyph: "🛡️", color: "#C4A277", damage: 13, mass: 3.4 },
    { id: "carapace", name: "Carapace", glyph: "🦂", color: "#A88A5C", damage: 11, behavior: "sticky" },
  ),
  line(
    { id: "gust", name: "Gust", glyph: "🌬️", color: "#A8E0E0", behavior: "light", mass: 0.55, radius: 10, restitution: 0.96, damage: 3 },
    { id: "cyclone", name: "Cyclone", glyph: "🌪️", color: "#7BC4C4", damage: 6, behavior: "magnet" },
    { id: "zephyr", name: "Zephyr", glyph: "☁️", color: "#D4F0F0", damage: 5, behavior: "ghost", restitution: 0.99 },
  ),
  line(
    { id: "pebble", name: "Pebble", glyph: "🔘", color: "#A8A878", behavior: "standard", mass: 1, radius: 12, restitution: 0.78, damage: 5 },
    { id: "geode", name: "Geode", glyph: "💎", color: "#8AA8C4", damage: 9, behavior: "splitter" },
    { id: "flint", name: "Flint", glyph: "🪶", color: "#8C8C6A", damage: 8, behavior: "heavy", mass: 2.2 },
  ),
];

const ALL: CritterDef[] = LINES.flat();

export const CRITTERS: Record<string, CritterDef> = Object.fromEntries(
  ALL.map((c) => [c.id, c]),
);

export const BASE_CRITTERS: readonly CritterDef[] = ALL.filter((c) => c.stage === 1);

export function getCritter(id: string): CritterDef {
  const def = CRITTERS[id];
  if (!def) throw new Error(`Unknown critter id: ${id}`);
  return def;
}
