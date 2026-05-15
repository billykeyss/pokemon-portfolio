"use client";

import { resumeData, type Hobby } from "@/data/resume-data";

// Minimal sprite + type lookup (mirrors app/page.tsx; kept local so the mockup is self-contained)
const POKEMON_ID: Record<string, number> = {
  machamp: 68,
  lugia: 249,
  articuno: 144,
  magnemite: 81,
  bulbasaur: 1,
  paras: 46,
};
const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const TYPE_BG: Record<string, string> = {
  fighting: "#C03028",
  psychic: "#F85888",
  ice: "#98D8D8",
  electric: "#F8D030",
  grass: "#78C850",
  fire: "#F08030",
  water: "#6890F0",
  normal: "#A8A878",
};
const TYPE_INK: Record<string, string> = {
  fighting: "#fff",
  psychic: "#fff",
  ice: "#1B1612",
  electric: "#1B1612",
  grass: "#fff",
  fire: "#fff",
  water: "#fff",
  normal: "#1B1612",
};
const TYPE_ABBREV: Record<string, string> = {
  fighting: "Fight",
  psychic: "Psy",
  ice: "Ice",
  electric: "Elec",
  grass: "Grass",
  fire: "Fire",
  water: "Water",
  normal: "Norm",
};

function tagline(h: Hobby): string {
  return (h.highlights ?? []).slice(0, 3).join(" · ") || h.experience;
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function HobbyCardVariants() {
  const hobbies = resumeData.hobbies;
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Hobby Card · description layouts</h1>
        <p className="text-sm opacity-70">
          Four options for surfacing the per-hobby <code>description</code> field that's currently in the data but not shown on the live site.
        </p>
      </header>

      <Section
        letter="A"
        title="Pokédex flavour text"
        pitch="Italic description sits as a sub-line under the name, above the highlights tagline. Mirrors a real Pokédex entry — small, atmospheric, always visible. Minimal layout change, just an extra line."
      >
        {hobbies.map((h) => <CardA key={h.name} h={h} />)}
      </Section>

      <Section
        letter="B"
        title="Two-block stack"
        pitch="Card splits into 'identity' (sprite + name + type) on top and a 'paragraph' (description + tagline chips) below. Description becomes the dominant text. Bigger cards but most readable."
      >
        {hobbies.map((h) => <CardB key={h.name} h={h} />)}
      </Section>

      <Section
        letter="C"
        title="Hover/tap reveal"
        pitch="Default state is the compact card you have today. On hover (or tap), the description fades in as an overlay over the highlights. Compact + tidy, but desktop-only feels."
      >
        {hobbies.map((h) => <CardC key={h.name} h={h} />)}
      </Section>

      <Section
        letter="D"
        title="Flip card"
        pitch="Front = current compact card. Click/hover flips to the back showing the description as a full Pokédex entry. Most playful, least skim-friendly. Best for portfolio personality."
      >
        {hobbies.map((h) => <CardD key={h.name} h={h} />)}
      </Section>
    </div>
  );
}

function Section({
  letter,
  title,
  pitch,
  children,
}: {
  letter: string;
  title: string;
  pitch: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-baseline gap-3">
        <span className="text-2xl font-bold opacity-30">{letter}</span>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-xs opacity-70 ml-auto max-w-2xl text-right">{pitch}</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-3 p-5 bg-amber-50/30 dark:bg-gray-900/30">
        {children}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CARD VARIANTS
// ─────────────────────────────────────────────

function Sprite({ h }: { h: Hobby }) {
  const pid = POKEMON_ID[h.pokemon] ?? 25;
  return (
    <span
      className="w-10 h-10 shrink-0 flex items-center justify-center border-[1.5px] border-black"
      style={{ background: TYPE_BG[h.type] }}
    >
      <img src={spriteUrl(pid)} alt={h.pokemon} className="w-8 h-8" style={{ imageRendering: "pixelated" }} />
    </span>
  );
}

function TypeBadge({ h }: { h: Hobby }) {
  return (
    <span
      className="text-[8px] font-bold px-1.5 py-0.5 uppercase shrink-0"
      style={{
        background: TYPE_BG[h.type],
        color: TYPE_INK[h.type],
        fontFamily: "Silkscreen, monospace",
        letterSpacing: "0.06em",
        textShadow: TYPE_INK[h.type] === "#fff" ? "1px 1px 0 rgba(0,0,0,0.3)" : "none",
      }}
    >
      {TYPE_ABBREV[h.type] ?? h.type.slice(0, 4)}
    </span>
  );
}

// ── A · Pokédex flavour text (small italic sub-line) ──
function CardA({ h }: { h: Hobby }) {
  return (
    <div className="flex items-start gap-3 p-3 border-2 border-black bg-white dark:bg-gray-100 dark:text-black rounded-md">
      <Sprite h={h} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider" style={{ fontFamily: "Silkscreen, monospace" }}>
            {h.name}
          </span>
          <TypeBadge h={h} />
        </div>
        <p className="text-[11px] italic opacity-75 mt-0.5 leading-snug">{h.description}</p>
        <p className="text-[10px] mt-1 leading-snug" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          {tagline(h)}
        </p>
      </div>
    </div>
  );
}

// ── B · Two-block (description as a paragraph below) ──
function CardB({ h }: { h: Hobby }) {
  return (
    <div className="p-3 border-2 border-black bg-white dark:bg-gray-100 dark:text-black rounded-md">
      <div className="flex items-center gap-3 pb-2 border-b border-black/15">
        <Sprite h={h} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[11px] uppercase tracking-wider" style={{ fontFamily: "Silkscreen, monospace" }}>
              {h.name}
            </span>
            <TypeBadge h={h} />
          </div>
          <p className="text-[10px] opacity-60 mt-0.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {h.experience}
          </p>
        </div>
      </div>
      <p className="text-[12px] leading-relaxed pt-2">{h.description}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {(h.highlights ?? []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[8px] px-1.5 py-0.5 border border-black bg-amber-50 rounded-full"
            style={{ fontFamily: "Press Start 2P, monospace" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── C · Hover reveal (description shows on hover) ──
function CardC({ h }: { h: Hobby }) {
  return (
    <div className="group relative overflow-hidden flex items-start gap-3 p-3 border-2 border-black bg-white dark:bg-gray-100 dark:text-black rounded-md cursor-pointer">
      <Sprite h={h} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider" style={{ fontFamily: "Silkscreen, monospace" }}>
            {h.name}
          </span>
          <TypeBadge h={h} />
        </div>
        <p className="text-[10px] mt-1 leading-snug" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          {tagline(h)}
        </p>
      </div>
      <div className="absolute inset-0 flex items-center px-3 py-3 bg-amber-50/95 text-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <p className="text-[11px] leading-snug italic">{h.description}</p>
      </div>
    </div>
  );
}

// ── D · Flip card (hover flips to back) ──
function CardD({ h }: { h: Hobby }) {
  return (
    <div className="group relative h-[88px]" style={{ perspective: 600 }}>
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex items-start gap-3 p-3 border-2 border-black bg-white dark:bg-gray-100 dark:text-black rounded-md group-hover:[transform:rotateY(180deg)] transition-transform duration-500"
          style={{ backfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
        >
          <Sprite h={h} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] uppercase tracking-wider" style={{ fontFamily: "Silkscreen, monospace" }}>
                {h.name}
              </span>
              <TypeBadge h={h} />
            </div>
            <p className="text-[10px] mt-1 leading-snug" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {tagline(h)}
            </p>
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 flex items-center p-3 border-2 border-black rounded-md text-black opacity-0 group-hover:opacity-100 group-hover:[transform:rotateY(0deg)] [transform:rotateY(-180deg)] transition-all duration-500"
          style={{
            backfaceVisibility: "hidden",
            background: TYPE_BG[h.type],
            color: TYPE_INK[h.type],
          }}
        >
          <p className="text-[11px] italic leading-snug">
            <span className="font-bold not-italic block mb-1" style={{ fontFamily: "Silkscreen, monospace", fontSize: 10 }}>
              {h.name} · DEX ENTRY
            </span>
            {h.description}
          </p>
        </div>
      </div>
    </div>
  );
}
