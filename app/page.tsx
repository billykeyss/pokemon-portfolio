"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import "./dossier.css";
import { resumeData, type Experience, type Hobby } from "@/data/resume-data";
import { GEN1_POKEMON } from "@/utils/pokemon";

/* ───────────────────────── Augmenting metadata ─────────────────────────
 * resume-data.ts is the source of truth for the *content* of each role,
 * project, school, and hobby. This file adds Pokémon flavour on top:
 * sprite IDs, type colour pairings, concurrent-overlap relationships,
 * and "training arc" grouping for the four early internships. */

type Slug =
  | "capsule"
  | "keplar"
  | "sesh"
  | "v12"
  | "amazon"
  | "training"
  | "waterloo";

interface ExpMeta {
  slug: Slug;
  pokemonId: number;
  types: string[];
  overlaps: Slug[];
  isSide?: boolean;
}

const EXP_META: Record<Slug, ExpMeta> = {
  capsule: {
    slug: "capsule",
    pokemonId: 150, // Mewtwo — lab-made super-intelligence
    types: ["psychic"],
    overlaps: ["v12", "sesh"],
  },
  keplar: {
    slug: "keplar",
    pokemonId: 132, // Ditto — copies anything = audience simulation
    types: ["normal"],
    overlaps: ["v12", "sesh"],
  },
  sesh: {
    slug: "sesh",
    pokemonId: 68,
    types: ["fighting"],
    overlaps: ["capsule", "keplar", "v12", "amazon"],
    isSide: true,
  },
  v12: {
    slug: "v12",
    pokemonId: 106, // Hitmonlee — the Kicking Pokémon (feet → climbing shoes)
    types: ["fighting"],
    overlaps: ["capsule", "keplar", "sesh", "amazon"],
    isSide: true,
  },
  amazon: {
    slug: "amazon",
    pokemonId: 462, // Magnezone — final form = Senior SDE (the level-up arc)
    types: ["steel", "electric"],
    overlaps: ["sesh", "v12"],
  },
  training: {
    slug: "training",
    pokemonId: 133, // Eevee — many evolution paths = exploring careers
    types: ["normal"],
    overlaps: ["waterloo"],
  },
  waterloo: {
    slug: "waterloo",
    pokemonId: 65, // Alakazam — the academic / high-IQ era
    types: ["psychic"],
    overlaps: ["training"],
  },
};

// Standalone roles only. Internships are grouped into the Training Arc and the
// Amazon Lab 126 FTE roles into a single "amazon" entry (see buildEntries).
function metaFor(exp: Experience): Slug | null {
  const t = exp.title;
  if (/Capsule/.test(t)) return "capsule";
  if (/Keplar/.test(t)) return "keplar";
  if (/Sesh/.test(t)) return "sesh";
  if (/V12/.test(t)) return "v12";
  return null;
}

/* ─────────────────────────── Type helpers ──────────────────────────── */
const TYPE_ABBREV: Record<string, string> = {
  normal: "Norm",
  fire: "Fire",
  water: "Water",
  electric: "Elec",
  grass: "Grass",
  psychic: "Psy",
  fighting: "Fight",
  flying: "Fly",
  steel: "Steel",
  ghost: "Ghost",
  bug: "Bug",
  dragon: "Dragon",
  ice: "Ice",
  poison: "Psn",
};
const LIGHT_TYPES = new Set(["electric", "normal", "flying", "ice"]);
const isLightType = (t: string) => LIGHT_TYPES.has(t);
const typeVar = (t: string) => `var(--t-${t})`;

/* Pokémon name → sprite ID for hobby cards (matches the names in resume-data) */
const POKEMON_ID: Record<string, number> = {
  alakazam: 65,
  machamp: 68,
  charmander: 4,
  pikachu: 25,
  abra: 63,
  lugia: 249,
  bulbasaur: 1,
  lapras: 131,
  jigglypuff: 39,
  articuno: 144,
  magnemite: 81,
  paras: 46,
};
const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

/* ─────────────────────────── Date math ─────────────────────────────── */
const FIRST_YEAR = 2013; // right edge of the axis (start of the Waterloo era)
const NOW_MONTH = (2026 - FIRST_YEAR) * 12 + 6; // today ≈ mid-2026; bump over time
const TOTAL_MONTHS = NOW_MONTH + 2; // axis left edge sits just past "now"
function months(date: string): number {
  // Ongoing roles end at "now", not at the right end of the axis.
  if (!date || date === "Present") return NOW_MONTH;
  const [y, m] = date.split("-").map(Number);
  return (y - FIRST_YEAR) * 12 + (m - 1);
}
const pct = (m: number) => `${((m / TOTAL_MONTHS) * 100).toFixed(1)}%`;

function yearLabel(start: string, end: string): string {
  const s = start.slice(0, 4);
  if (end === "Present") return `${s} –`;
  const e = end.slice(0, 4);
  return s === e ? s : `${s}–${e.slice(2)}`;
}
const dexNo = (id: number) => id.toString().padStart(3, "0");

/* ─────────────── Build the dossier model from resume-data ──────────── */

// A sub-role inside a grouped entry — one internship (Training Arc) or one
// Amazon level. pokemonId, when set, renders an evolution-stage sprite on the
// chip (used for the Amazon SDE I → II → Senior level-up line).
type StintInfo = {
  name: string; // company (intern) or level (e.g. "SDE I")
  year: string;
  role: string;
  highlight: string;
  details: string[];
  pokemonId?: number;
  start?: string; // "YYYY-MM" — used to draw timeline-bar segments (Amazon)
  end?: string;
};

type DossierEntry = {
  slug: Slug;
  title: string;
  role: string;
  start: string; // "YYYY-MM" or earliest sub-role start
  end: string; // "YYYY-MM" or "Present"
  link?: string;
  highlight: string;
  meta: ExpMeta;
  stints?: StintInfo[]; // populated for grouped entries (Training Arc, Amazon)
};

function buildEntries(): DossierEntry[] {
  const direct: DossierEntry[] = [];
  const interns: Experience[] = [];
  const amazonRoles: Experience[] = [];

  for (const exp of resumeData.experiences) {
    // Internships group into the Training Arc — check first, since the 2017
    // intern is also an "Amazon Lab 126" title.
    if (/intern/i.test(exp.role)) {
      interns.push(exp);
      continue;
    }
    // The three Amazon Lab 126 FTE roles group into one level-up entry.
    if (/Amazon Lab 126/.test(exp.title)) {
      amazonRoles.push(exp);
      continue;
    }
    const slug = metaFor(exp);
    if (slug) {
      direct.push({
        slug,
        title: exp.title,
        role: exp.role,
        start: exp.startDate,
        end: exp.endDate,
        link: exp.link,
        highlight: exp.highlight,
        meta: EXP_META[slug],
      });
    }
  }

  // Build a single "Amazon Lab 126" entry from the three FTE roles, shown as an
  // evolution line (Magnemite → Magneton → Magnezone) in the hover.
  if (amazonRoles.length) {
    const startMs = amazonRoles.map((r) => months(r.startDate));
    const endMs = amazonRoles.map((r) => months(r.endDate));
    const earliestStart =
      amazonRoles[startMs.indexOf(Math.min(...startMs))].startDate;
    const latestEnd = amazonRoles[endMs.indexOf(Math.max(...endMs))].endDate;

    const EVO = [81, 82, 462]; // Magnemite → Magneton → Magnezone
    const levelOf = (role: string) =>
      /senior/i.test(role) ? "SDE III" : /\bII\b/.test(role) ? "SDE II" : "SDE I";

    // Oldest → newest, so the evolution reads base → final, top → bottom
    const stints: StintInfo[] = [...amazonRoles]
      .sort((a, b) => months(a.startDate) - months(b.startDate))
      .map((r, i) => ({
        name: levelOf(r.role),
        year: yearLabel(r.startDate, r.endDate),
        role: r.role,
        highlight: r.highlight,
        details: r.details,
        pokemonId: EVO[Math.min(i, EVO.length - 1)],
        start: r.startDate,
        end: r.endDate,
      }));

    direct.push({
      slug: "amazon",
      title: "Amazon Lab 126",
      role: "SDE I → SDE II → SDE III · FireTV & Astro",
      start: earliestStart,
      end: latestEnd,
      link: "https://www.aboutamazon.com/news/devices/meet-astro",
      highlight:
        "Five years at Amazon Lab 126 across FireTV and the Astro home robot, leveling up from SDE I to SDE III.",
      meta: EXP_META.amazon,
      stints,
    });
  }

  // Build a single "Training Arc" entry from the grouped internships
  if (interns.length) {
    const startMonths = interns.map((i) => months(i.startDate));
    const endMonths = interns.map((i) => months(i.endDate));
    const earliestStart =
      interns[startMonths.indexOf(Math.min(...startMonths))].startDate;
    const latestEnd =
      interns[endMonths.indexOf(Math.max(...endMonths))].endDate;
    const summary = interns
      .map(
        (i) =>
          `**${i.title.replace(/, FireTV| Lab/, "").split(",")[0]} (${i.startDate.slice(
            0,
            4,
          )})** · ${i.highlight}`,
      )
      .join(" ");
    // A thematically-related Pokémon for each internship
    const internPokemon = (i: Experience): number => {
      if (/nanoPay/i.test(i.title)) return 52; // Meowth — fintech / Pay Day
      if (/Amazon/i.test(i.title)) return 479; // Rotom — possesses the Echo device
      if (/Connected/i.test(i.title))
        return i.startDate.slice(0, 4) === "2017" ? 63 : 137; // Abra (AI chatbot) / Porygon (build tooling)
      return 25; // fallback: Pikachu
    };

    // Per-internship detail, oldest → newest, for the hover-to-inspect list
    const internInfos: StintInfo[] = [...interns]
      .sort((a, b) => months(a.startDate) - months(b.startDate))
      .map((i) => ({
        name: i.title.split(",")[0],
        year: i.startDate.slice(0, 4),
        role: i.role,
        highlight: i.highlight,
        details: i.details,
        pokemonId: internPokemon(i),
      }));

    direct.push({
      slug: "training",
      title: "The Training Arc",
      role: `${interns.length} internships · ${interns
        .map((i) => i.title.split(",")[0])
        .reverse()
        .join(" → ")}`,
      start: earliestStart,
      end: latestEnd,
      highlight: summary,
      meta: EXP_META.training,
      stints: internInfos,
    });
  }

  // The University of Waterloo era — the academic foundation the internships
  // happened within (5-year co-op B.Eng, graduated Apr 2018).
  const uw = resumeData.education.find((e) => /Waterloo/i.test(e.school));
  if (uw) {
    direct.push({
      slug: "waterloo",
      title: "University of Waterloo",
      role: "BASc, Computer Engineering (Co-op)",
      start: "2013-09",
      end: "2018-04",
      link: "https://uwaterloo.ca/",
      highlight:
        "Bachelor of Computer Engineering on the co-op program. Capstone: Unreal sensor simulation for autonomous vehicles (Best Presentation Award). Exchange semester at Lund University, Sweden.",
      meta: EXP_META.waterloo,
    });
  }

  // Chronological order, oldest → newest (left → right in horizontal timeline)
  direct.sort((a, b) => months(a.start) - months(b.start));
  return direct;
}

/* ─────────────────────── Random Gen-1 party ─────────────────────────
 * Renders empty on the server; client picks a fresh 6-Pokémon team on
 * mount and fades them in. Avoids the flash of the default party. */
type PartyMember = { id: number; name: string };

function pickRandomParty(): PartyMember[] {
  const picked = new Set<number>();
  while (picked.size < 6) {
    picked.add(Math.floor(Math.random() * GEN1_POKEMON.length));
  }
  return Array.from(picked).map((i) => ({
    id: i + 1, // GEN1_POKEMON is ordered by dex; index → dex no.
    name: GEN1_POKEMON[i]
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
  }));
}

/* Pokéball variants for project-card corner badges */
const POKEBALL_VARIANTS = [
  "var-poke",   // red — classic
  "var-great",  // blue — Great Ball
  "var-ultra",  // gold/dark — Ultra Ball
  "var-heal",   // pink — Heal Ball
  "var-dusk",   // dark green — Dusk Ball
  "var-master", // purple — Master Ball
];
/* Deterministic title→variant hash so each project gets a stable, varied ball
   without an SSR/client hydration mismatch from Math.random. */
function pokeballForTitle(title: string): string {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return POKEBALL_VARIANTS[Math.abs(h) % POKEBALL_VARIANTS.length];
}

/* ────────────────────── Curated trainer-card stats ────────────────── */
const TRAINER_STATS: Array<{
  label: string;
  value: string;
  fill?: number;
  link?: string;
}> = [
  { label: "Years Shipped",     value: "10+",              fill: 95 },
  { label: "Companies Founded", value: "×3",               fill: 60 },
  { label: "LinkedIn",          value: "yichenbillhuang",  link: "https://www.linkedin.com/in/yichenbillhuang/" },
  { label: "GitHub",            value: "billykeyss",       link: "https://github.com/billykeyss" },
];

/* ──────────────────────── React component ─────────────────────────── */

export default function V2DossierPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(buildEntries, []);
  const personal = resumeData.personal;
  const projects = resumeData.projects;
  const education = resumeData.education;
  const hobbies = resumeData.hobbies;

  // Pokéball-per-project. Initial value is the deterministic hash (so SSR and
  // first client paint match — no hydration warning), then useEffect re-rolls
  // truly random variants after mount so each page load varies.
  const [pokeballMap, setPokeballMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const p of projects) m[p.title] = pokeballForTitle(p.title);
    return m;
  });
  useEffect(() => {
    const m: Record<string, string> = {};
    for (const p of projects) {
      m[p.title] =
        POKEBALL_VARIANTS[
          Math.floor(Math.random() * POKEBALL_VARIANTS.length)
        ];
    }
    setPokeballMap(m);
  }, [projects]);

  // Random 6-Pokémon party shuffled on each load. SSR renders empty,
  // client picks fresh on mount, and the row fades in once populated.
  const [party, setParty] = useState<PartyMember[]>([]);
  useEffect(() => {
    setParty(pickRandomParty());
  }, []);

  // Timeline order: currently-active roles first (newest start first),
  // then past roles (newest start first). Puts Capsule, V12, Sesh on the left.
  const timelineOrder = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aActive = a.end === "Present" ? 1 : 0;
      const bActive = b.end === "Present" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return months(b.start) - months(a.start);
    });
  }, [entries]);

  // Currently-active roles (for the Active Quests strip).
  // The primary card (Capsule) is the main role; the other two are side quests.
  const activeQuests = useMemo(() => {
    const primary = resumeData.experiences.find((e) => /Capsule/.test(e.title));
    const sesh = resumeData.experiences.find((e) => /Sesh/.test(e.title));
    const v12 = resumeData.experiences.find((e) => /V12/.test(e.title));
    return [primary, v12, sesh].filter(Boolean) as Experience[];
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const entryBySlug = (slug: string) =>
      root.querySelector(`.entry[data-slug="${slug}"]`) as HTMLElement | null;

    const cleanups: Array<() => void> = [];

    function scrollToEntry(slug: string) {
      const target = entryBySlug(slug);
      if (!target) return;
      target.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      target.classList.add("is-source");
      setTimeout(() => target.classList.remove("is-source"), 1400);
    }

    root.querySelectorAll<HTMLElement>(".conc-chip").forEach((chip) => {
      const onClick = () => scrollToEntry(chip.dataset.target ?? "");
      chip.addEventListener("click", onClick);
      cleanups.push(() => chip.removeEventListener("click", onClick));
    });

    root
      .querySelectorAll<HTMLElement>(".route-bar[data-target]")
      .forEach((bar) => {
        const onClick = () => scrollToEntry(bar.dataset.target ?? "");
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        };
        bar.addEventListener("click", onClick);
        bar.addEventListener("keydown", onKey);
        cleanups.push(() => {
          bar.removeEventListener("click", onClick);
          bar.removeEventListener("keydown", onKey);
        });
      });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div ref={rootRef} className="dossier-root">
      {/* ============ TOP STRIP ============ */}
      <header className="strip">
        <div className="strip-inner">
          <div className="pokeball spinner" aria-hidden="true" />
          <div className="strip-meta">
            <strong>{personal.name.toUpperCase()} HUANG</strong>
            <br />
            <span className="dex">No. 0151</span> · Developer Dossier
          </div>
          <nav className="strip-links">
            <a href="#now">Now</a>
            <a href="#journey">Journey</a>
            <a href="#projects">Projects</a>
            <a href="#academy">Academy</a>
            <a href="#interests">Interests</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div>
          <div className="eyebrow">Engineer · Founder · Operator</div>
          <h1>
            <span className="sparkle spark-1">✦</span>
            <span className="sparkle spark-2">✦</span>
            <span className="sparkle spark-3">✦</span>
            Ten years building things that <em>didn&apos;t exist yet.</em>
          </h1>
          <p className="hero-lede">
            Ten years compounding across home robotics, voice agents, retail
            commerce, and life-sciences AI. Currently Co-Founder &amp; Chief AI
            Officer at{" "}
            <a
              href="https://gocapsule.ai/"
              target="_blank"
              rel="noopener"
              className="lede-link"
            >
              <strong>Capsule</strong>
            </a>{" "}
            — the context system of record for pharma and biotech — selected
            for{" "}
            <a
              href="https://www.betaworks.com/writing/spring-2026-camp-agent-systems"
              target="_blank"
              rel="noopener"
              className="lede-link"
            >
              <strong>Betaworks Spring 2026: Agent Systems</strong>
            </a>
            .
          </p>
          <p className="hero-sub">
            &ldquo;The best engineers I know are obsessed with one thing for a
            decade. I&apos;m obsessed with the <em>new</em> thing for a decade
            running.&rdquo;
          </p>
        </div>

        <div className="hero-right">
          <aside className="gameboy-mini" aria-label="Game Boy Pokédex">
            <div className="gb-top">
              <span className="gb-led" aria-hidden="true" />
              <span>GAMEBOY</span>
              <span>DEV·26</span>
            </div>

            <div className="gb-screen">
              <div className="gb-scr-header">
                <span className="dex-no">No. 0151</span>
                <span className="dex-lv">Lv. 30</span>
              </div>

              <div className="gb-scr-body">
                <div className="gb-scr-portrait">
                  <img src={spriteUrl(65)} alt="Alakazam — trainer mascot" />
                </div>
                <div className="gb-scr-info">
                  <div className="gb-scr-name">
                    {personal.name.toUpperCase()} HUANG
                  </div>
                  <div className="gb-scr-role">CAIO · CAPSULE</div>
                  <div className="gb-scr-types">
                    <span
                      className="gb-scr-type"
                      style={{ background: typeVar("psychic") }}
                    >
                      PSY
                    </span>
                    <span
                      className="gb-scr-type"
                      style={{
                        background: typeVar("electric"),
                        color: "#2A301E",
                        textShadow: "none",
                      }}
                    >
                      ELE
                    </span>
                  </div>
                </div>
              </div>

              <div className="gb-scr-stats">
                {TRAINER_STATS.filter((s) => !s.link).map((s) => (
                  <div key={s.label} className="gb-stat-row">
                    <div className="gb-stat-meta">
                      <span className="gb-stat-label">{s.label}</span>
                      <span className="gb-stat-val">{s.value}</span>
                    </div>
                    <div
                      className="gb-stat-bar"
                      style={
                        { ["--fill" as string]: `${s.fill ?? 0}%` } as CSSProperties
                      }
                    />
                  </div>
                ))}

                <div className="gb-stat-divider"><span>Contact</span></div>

                {TRAINER_STATS.filter((s) => s.link).map((s) => (
                  <a
                    key={s.label}
                    href={s.link}
                    target="_blank"
                    rel="noopener"
                    className="gb-stat-row gb-stat-link"
                  >
                    <div className="gb-stat-meta">
                      <span className="gb-stat-label">{s.label}</span>
                      <span className="gb-stat-val">
                        {s.value}
                        <span className="gb-link-arrow" aria-hidden="true"> ↗</span>
                      </span>
                    </div>
                  </a>
                ))}
              </div>

              <div className="gb-grass" aria-hidden="true" />
              <div className={"gb-party" + (party.length ? " loaded" : "")}>
                {party.map((p) => (
                  <span
                    key={p.id}
                    className="gb-party-slot"
                    data-name={`${p.name} · #${p.id.toString().padStart(3, "0")}`}
                  >
                    <img src={spriteUrl(p.id)} alt={p.name} title={p.name} />
                  </span>
                ))}
              </div>
            </div>

            <div className="gb-controls">
              <div className="gb-dpad" aria-hidden="true" />
              <div className="gb-buttons" aria-hidden="true">
                <div className="gb-btn" data-letter="B" />
                <div className="gb-btn" data-letter="A" />
              </div>
            </div>
            <div className="gb-startsel" aria-hidden="true">
              <div className="gb-pill" data-label="SEL" />
              <div className="gb-pill" data-label="START" />
            </div>
          </aside>
        </div>
      </section>

      {/* ============ ACTIVE QUESTS ============ */}
      <section className="now" id="now">
        <div className="section-head">
          <span className="pretitle">► CHAPTER 01</span>
          <h2>
            Active <em>Quests.</em>
          </h2>
          <span className="count">CURRENTLY · 2026</span>
        </div>
        <div className="now-grid">
          {activeQuests.map((q, idx) => {
            const slug = metaFor(q);
            const m = slug ? EXP_META[slug] : null;
            const primary = idx === 0;
            return (
              <article
                key={q.title}
                className={primary ? "quest primary" : "quest"}
              >
                <div className="corner-sprite">
                  {m && <img src={spriteUrl(m.pokemonId)} alt="" />}
                </div>
                <div className="quest-tag">
                  <span>{q.title}</span>
                  <span className="role">{q.role}</span>
                </div>
                <h3>
                  {q.link ? (
                    <a href={q.link} target="_blank" rel="noopener">
                      {q.title}
                    </a>
                  ) : (
                    q.title
                  )}
                </h3>
                {m && (
                  <div className="types-row">
                    {m.types.map((t) => (
                      <span
                        key={t}
                        className="type-pill"
                        style={{
                          background: typeVar(t),
                          ...(isLightType(t)
                            ? { color: "#1B1612", textShadow: "none" }
                            : {}),
                        }}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </span>
                    ))}
                  </div>
                )}
                <p>{q.highlight}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============ JOURNEY: ROUTE MAP + HORIZONTAL TIMELINE ============ */}
      <section className="timeline-section" id="journey">
        <div className="section-head">
          <span className="pretitle">► CHAPTER 02</span>
          <h2>
            The <em>Journey.</em>
          </h2>
          <span className="count">
            {entries.length.toString().padStart(2, "0")} ENTRIES
          </span>
        </div>

        {/* ROUTE MAP */}
        <RouteMap entries={entries} />

        {/* HORIZONTAL TIMELINE — active roles first, then past (newest first) */}
        <div className="timeline">
          {timelineOrder.map((e) => (
            <TimelineEntry key={e.slug} entry={e} entries={entries} />
          ))}
        </div>
      </section>

      {/* ============ PROJECTS ============ */}
      <section className="projects" id="projects">
        <div className="section-head">
          <span className="pretitle">► CHAPTER 03</span>
          <h2>
            Field <em>Notes.</em>
          </h2>
          <span className="count">SELECTED PROJECTS</span>
        </div>
        {(() => {
          // First featured project becomes the hero; remainder fills the grid.
          const hero = projects.find((p) => p.featured) ?? projects[0];
          const rest = projects.filter((p) => p !== hero);
          return (
            <>
              {hero && (
                <article className="project-hero">
                  <span className="hero-badge">★ Featured Project</span>
                  <div className="hero-top">
                    {hero.image && !hero.image.includes("placeholder") && (
                      hero.link ? (
                        <a
                          href={hero.link}
                          target="_blank"
                          rel="noopener"
                          className="hero-logo-link"
                          aria-label={`Open ${hero.title}`}
                        >
                          <img
                            className="hero-logo"
                            src={hero.image}
                            alt={`${hero.title} logo`}
                          />
                        </a>
                      ) : (
                        <img
                          className="hero-logo"
                          src={hero.image}
                          alt={`${hero.title} logo`}
                        />
                      )
                    )}
                    <div className="hero-top-text">
                      <div className="hero-meta">
                        <span>{hero.year}</span>
                        <span>·</span>
                        <span>{hero.category.toUpperCase()}</span>
                        {hero.award && (
                          <>
                            <span>·</span>
                            <span className="hero-award">
                              🏆 {hero.award.split(/[—-]/)[0].trim()}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="hero-title">
                        {hero.link ? (
                          <a
                            href={hero.link}
                            target="_blank"
                            rel="noopener"
                            style={{ color: "inherit", textDecoration: "none" }}
                          >
                            {hero.title}
                          </a>
                        ) : (
                          hero.title
                        )}
                      </h3>
                      <p className="hero-tagline">{hero.description}</p>
                    </div>
                  </div>
                  <p className="hero-detail">{hero.details}</p>
                  <div className="stack">
                    {hero.techStack.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  {hero.link && (
                    <a
                      className="hero-cta"
                      href={hero.link}
                      target="_blank"
                      rel="noopener"
                    >
                      Visit Project →
                    </a>
                  )}
                </article>
              )}

              <div className="project-grid">
                {rest.map((p) => (
                  <article key={p.title} className="project">
                    <span
                      className={`pokeball-corner ${pokeballMap[p.title] ?? pokeballForTitle(p.title)}`}
                      aria-hidden="true"
                    >
                      <span className="pball-top" />
                      <span className="pball-band" />
                      <span className="pball-button" />
                      <span className="pball-shine" />
                    </span>
                    <div className="ptag">
                      <span>
                        {p.year} · {p.category.toUpperCase()}
                      </span>
                      {p.award ? (
                        <span className="award">
                          ★ {p.award.split(/[—-]/)[0].trim()}
                        </span>
                      ) : p.featured ? (
                        <span className="award">★ Featured</span>
                      ) : (
                        <span />
                      )}
                    </div>
                    <h3>
                      {p.link ? (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}
                    </h3>
                    <p>{p.description}</p>
                    <div className="stack">
                      {p.techStack.slice(0, 4).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    {p.link && (
                      <a
                        className="project-cta"
                        href={p.link}
                        target="_blank"
                        rel="noopener"
                      >
                        Visit →
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </>
          );
        })()}
      </section>

      {/* ============ ACADEMY + INTERESTS ============ */}
      <section className="twocol">
        <div id="academy">
          <h2>
            The <em>Academy.</em>
          </h2>
          <div className="edu-list">
            {education.map((e) => (
              <div key={e.school} className="edu-item">
                <div className="school">{e.school}</div>
                <div className="deg">
                  {e.degree}
                  {e.details &&
                  e.details.length === 1 &&
                  e.degree.includes("Diploma")
                    ? ` · ${e.details[0]}`
                    : null}
                </div>
                <div className="date">{e.date}</div>
                {e.details && e.details.length > 1 && (
                  <ul>
                    {e.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <div id="interests">
          <h2>
            Off the <em>clock.</em>
          </h2>
          <div className="types">
            {hobbies.map((h) => (
              <HobbyCard key={h.name} h={h} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <span>© 2026 · DEVELOPER #0151</span>
        <span className="mark">
          <span
            className="footer-ball pokeball"
            style={{
              width: 18,
              height: 18,
              display: "inline-block",
              verticalAlign: -3,
            }}
          />
          Gotta ship &apos;em all.
        </span>
      </footer>
    </div>
  );
}

/* ─────────────────────── Subcomponents ──────────────────────── */

function RouteMap({ entries }: { entries: DossierEntry[] }) {
  // Reverse-chronological: newest role at the top to match the flipped X axis
  const ordered = [...entries].sort(
    (a, b) => months(b.start) - months(a.start),
  );
  return (
    <div className="route-map">
      <div className="route-head">
        <span className="title">Route 013 ─ 026 · Career Span</span>
        <div className="legend">
          <span>
            <i className="swatch-past" />
            Past
          </span>
          <span>
            <i className="swatch-current" />
            Current
          </span>
          <span>
            <i className="swatch-side" />
            Side Quest
          </span>
          <span>
            <i className="swatch-main" />
            Main Story
          </span>
        </div>
      </div>

      <div className="route-scroll">
        <div className="route-grid">
        {ordered.map((e) => {
          const startM = months(e.start);
          const endM = months(e.end);
          // X axis is flipped: recent dates on the left, oldest on the right
          const left = pct(TOTAL_MONTHS - endM);
          const width = pct(endM - startM);
          const isCurrent = e.end === "Present";
          const primaryType = e.meta.types[0];
          const isLight = isLightType(primaryType);
          return (
            <div key={e.slug} className="route-row">
              <div className="row-label">
                {labelFor(e)}{" "}
                {e.meta.isSide && <span className="side">SIDE</span>}
              </div>
              <div className="route-track">
                {e.slug === "amazon" && e.stints ? (
                  (() => {
                    // Amazon level-up arc: one bar split into three promotion
                    // segments (SDE I → SDE II → Senior), with evolution arrows
                    // at each promotion (Magnemite → Magneton → Magnezone).
                    const arr = [...e.stints].sort(
                      (a, b) => months(a.start!) - months(b.start!),
                    );
                    return (
                      <>
                        {arr.map((s, i) => {
                          const segStart = months(s.start!);
                          // Snap each segment to the next promotion so they tile
                          const segEnd =
                            i < arr.length - 1
                              ? months(arr[i + 1].start!)
                              : months(s.end!);
                          // The lead (newest) segment carries the company name,
                          // like every other bar; the rest just show the level.
                          const segLabel =
                            i === arr.length - 1 ? `Amazon · ${s.name}` : s.name;
                          return (
                            <div
                              key={s.name}
                              className="route-bar route-seg"
                              data-target="amazon"
                              role="button"
                              tabIndex={0}
                              title={`${s.name} · ${s.year}`}
                              style={
                                {
                                  left: pct(TOTAL_MONTHS - segEnd),
                                  width: pct(segEnd - segStart),
                                  // Darker steel for earlier stages → brightest at Senior
                                  background: `color-mix(in srgb, var(--t-steel), black ${
                                    (arr.length - 1 - i) * 16
                                  }%)`,
                                } as CSSProperties
                              }
                            >
                              {/* Each segment shows its own evolution stage:
                                  Magnemite → Magneton → Magnezone */}
                              <span className="seg-sprite">
                                <img src={spriteUrl(s.pokemonId!)} alt="" />
                              </span>
                              <span className="bar-text">{segLabel}</span>
                            </div>
                          );
                        })}
                        {/* Evolution arrow at each promotion boundary, pointing
                            toward the more-evolved (more recent) stage. */}
                        {arr.slice(0, -1).map((s, i) => (
                          <span
                            key={`evo-${s.name}`}
                            className="evo-arrow"
                            aria-hidden="true"
                            style={{
                              left: pct(
                                TOTAL_MONTHS - months(arr[i + 1].start!),
                              ),
                            }}
                          >
                            ◂
                          </span>
                        ))}
                      </>
                    );
                  })()
                ) : (
                  <div
                    className={[
                      "route-bar",
                      isCurrent && "current",
                      e.slug === "capsule" && "main-story",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-target={e.slug}
                    role="button"
                    tabIndex={0}
                    style={
                      {
                        ["--bar-color" as string]: typeVar(primaryType),
                        left,
                        width,
                        ...(isLight
                          ? {
                              color: "#1B1612",
                              textShadow: "1px 1px 0 rgba(255,255,255,0.4)",
                            }
                          : {}),
                      } as CSSProperties
                    }
                  >
                    <span className="bar-sprite">
                      <img src={spriteUrl(e.meta.pokemonId)} alt="" />
                    </span>
                    <span className="bar-text">{shortRoleFor(e)}</span>
                    {isCurrent && e.slug === "capsule" && (
                      <span className="now-flag">★ Now</span>
                    )}
                    {e.meta.isSide && <span className="side-flag">Side</span>}
                  </div>
                )}
                {e.slug === "capsule" && (
                  <div
                    className="now-marker"
                    style={{ left: pct(TOTAL_MONTHS - NOW_MONTH) }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

        <div className="year-axis">
          {/* Month-accurate ticks at 5-year increments; "NOW" marks today.
              The spacer keeps the axis aligned under the pinned label column. */}
          <div className="year-axis-spacer" aria-hidden="true" />
          <div className="year-axis-track">
            {Array.from(
              { length: Math.floor(NOW_MONTH / 12) + 1 },
              (_, i) => FIRST_YEAR + i,
            ).map((year) => (
              <span
                key={year}
                className="yr"
                style={{
                  left: pct(TOTAL_MONTHS - (year - FIRST_YEAR) * 12),
                }}
              >
                &apos;{(year % 100).toString().padStart(2, "0")}
              </span>
            ))}
            <span
              className="yr now"
              style={{ left: pct(TOTAL_MONTHS - NOW_MONTH) }}
            >
              NOW
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFor(e: DossierEntry): string {
  if (e.slug === "training") return "Internships ×4";
  if (e.slug === "waterloo") return "UWaterloo";
  if (e.slug === "amazon") return "Amazon Lab 126";
  if (e.slug === "sesh") return "Sesh";
  if (e.slug === "v12") return "V12 Resole";
  if (e.slug === "keplar") return "Keplar.io";
  if (e.slug === "capsule") return "Capsule";
  return e.title;
}

function shortRoleFor(e: DossierEntry): string {
  if (e.slug === "training") return "Training Arc · 4 Internships";
  if (e.slug === "waterloo") return "UWaterloo · Computer Eng";
  if (e.slug === "amazon") return "Amazon · SDE I → SDE III";
  if (e.slug === "sesh") return "Sesh Climbing · Founder";
  if (e.slug === "v12") return "V12 Resole · CTO";
  if (e.slug === "keplar") return "Keplar · Founding Eng";
  if (e.slug === "capsule") return "Capsule · Chief AI Officer";
  return e.role;
}

function TimelineEntry({
  entry,
  entries,
}: {
  entry: DossierEntry;
  entries: DossierEntry[];
}) {
  const m = entry.meta;
  const isCurrent = entry.end === "Present";
  // Discoverability hint for this card's hover interactions
  const hint = entry.stints
    ? entry.slug === "amazon"
      ? "Hover each promotion below to see what I shipped at that level."
      : "Hover each internship below to see what I worked on."
    : m.overlaps.length > 0
      ? "Hover or click a concurrent role below to jump to it on the timeline."
      : "Hover the role above to inspect it on the route map.";
  return (
    <article
      className="entry"
      data-slug={entry.slug}
      data-color={typeVar(m.types[0])}
    >
      <div className="node">
        <span className="dex">No. {dexNo(m.pokemonId)}</span>
        <div
          className="sprite"
          style={
            { ["--type-bg" as string]: typeVar(m.types[0]) } as CSSProperties
          }
        >
          <img src={spriteUrl(m.pokemonId)} alt={entry.title} />
        </div>
        <span className="year">{yearLabel(entry.start, entry.end)}</span>
      </div>
      <div className="card">
        <div className="meta">
          <span>{entry.title}</span>
          {m.isSide && <span className="side-tag">Side</span>}
          {isCurrent && <span className="now-tag-inline">Now</span>}
          <span
            className="info-icon"
            tabIndex={0}
            role="note"
            aria-label={hint}
          >
            i
            <span className="info-tip" role="tooltip">
              {hint}
            </span>
          </span>
        </div>
        <h3>
          {entry.link ? (
            <a href={entry.link} target="_blank" rel="noopener">
              {entry.title}
            </a>
          ) : (
            entry.title
          )}
        </h3>
        <div className="role">{entry.role}</div>
        <div className="types-row">
          {m.types.map((t) => (
            <span
              key={t}
              className="type-pill"
              style={{
                background: typeVar(t),
                ...(isLightType(t)
                  ? { color: "#1B1612", textShadow: "none" }
                  : {}),
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
        {entry.stints ? (
          <div className="intern-arc">
            <span className="intern-arc-hint">
              {entry.slug === "amazon"
                ? "Leveled up 3× — hover to inspect ▸"
                : "Hover each to inspect ▸"}
            </span>
            {entry.stints.map((it) => (
              <div
                className="intern-chip"
                key={`${it.name}-${it.year}`}
                tabIndex={0}
              >
                <span className="intern-head">
                  {it.pokemonId && (
                    <img
                      className="intern-evo"
                      src={spriteUrl(it.pokemonId)}
                      alt=""
                      aria-hidden="true"
                    />
                  )}
                  <span className="intern-name">{it.name}</span>
                  <span className="intern-year">{it.year}</span>
                </span>
                <div className="intern-pop" role="tooltip">
                  <span className="intern-role">{it.role}</span>
                  <p className="intern-highlight">{it.highlight}</p>
                  <ul className="intern-details">
                    {it.details.slice(0, 2).map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="highlight">{entry.highlight}</p>
        )}
        {m.overlaps.length > 0 && (
          <div className="concurrent">
            <span className="concurrent-label">While here</span>
            {m.overlaps.map((peer) => {
              const peerEntry = entries.find((x) => x.slug === peer);
              if (!peerEntry) return null;
              return (
                <span
                  key={peer}
                  className="conc-chip"
                  data-target={peer}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    className="conc-sprite"
                    src={spriteUrl(peerEntry.meta.pokemonId)}
                    alt=""
                    aria-hidden="true"
                  />
                  {shortRoleFor(peerEntry)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a transparent placeholder during SSR/first paint to keep layout stable
  if (!mounted) {
    return <button className="theme-toggle" aria-hidden="true" tabIndex={-1} />;
  }
  const isDark = (resolvedTheme ?? theme) === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
    </button>
  );
}

function HobbyCard({ h }: { h: Hobby }) {
  const pid = POKEMON_ID[h.pokemon] ?? 25;
  const abbrev = TYPE_ABBREV[h.type] ?? h.type.slice(0, 4);
  const tagline = (h.highlights ?? []).slice(0, 3).join(" · ") || h.experience;
  return (
    // tabIndex makes the card focusable so :focus-within can drive the reveal
    // for keyboard users (and mobile taps that focus the element).
    <span className="type-card" tabIndex={0}>
      <span
        className="sprite-mini"
        style={{ ["--type-bg" as string]: typeVar(h.type) } as CSSProperties}
      >
        <img src={spriteUrl(pid)} alt="" />
      </span>
      <span className="info">
        <span className="name">{h.name}</span>
        <span className="yrs">{tagline}</span>
      </span>
      <span className="badges">
        <span
          className="badge"
          style={{
            background: typeVar(h.type),
            ...(isLightType(h.type)
              ? { color: "#1B1612", textShadow: "none" }
              : {}),
          }}
        >
          {abbrev}
        </span>
        {h.type2 && (
          <span
            className="badge"
            style={{
              background: typeVar(h.type2),
              ...(isLightType(h.type2)
                ? { color: "#1B1612", textShadow: "none" }
                : {}),
            }}
          >
            {TYPE_ABBREV[h.type2] ?? h.type2.slice(0, 4)}
          </span>
        )}
      </span>
      <span className="hover-desc">{h.description}</span>
    </span>
  );
}
