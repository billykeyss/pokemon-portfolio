"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Camera,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_COLORS, extractPalette, luma, parseHex, type Swatch } from "./engine/extract";
import {
  addPalette,
  emptyHistory,
  findSaved,
  loadHistory,
  removePalette,
  writeHistory,
  type PaletteHistory,
} from "./engine/history";
import { decodeColors, shareUrl } from "./engine/share";

// The longest side a photo is shrunk to before sampling. A 12MP camera shot
// has far more pixels than a five-colour palette needs, and k-means is linear
// in them — 160px keeps extraction instant on an old phone.
const SAMPLE_SIDE = 160;
const THUMB_SIDE = 96;
const COUNTS = [3, 4, 5, 6, 7, 8] as const;
const SOURCE_URL = "https://github.com/billykeyss/color-picker-android";
// Shown in the empty state until the visitor has saved a palette of their own.
const FAN_COLORS = ["#1d3557", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
// How long the photo takes to come into focus before its colours are pinned.
const DEVELOP_MS = 560;

const isDark = (hex: string): boolean => luma(parseHex(hex) ?? [0, 0, 0]) < 150;

const rgbText = (hex: string): string => {
  const [r, g, b] = parseHex(hex) ?? [0, 0, 0];
  return `rgb ${r} ${g} ${b}`;
};

const evenSwatches = (colors: readonly string[]): Swatch[] =>
  colors.map((hex) => ({ hex, weight: 1 / colors.length }));

interface Photo {
  url: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

/** Draw the image no larger than `side` on its longest edge. */
function shrink(img: HTMLImageElement, side: number): HTMLCanvasElement {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The palette as a portrait card, one band per colour with its hex printed on it. */
function paletteCard(swatches: readonly Swatch[]): Promise<Blob | null> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const band = height / swatches.length;
  swatches.forEach((s, i) => {
    ctx.fillStyle = s.hex;
    ctx.fillRect(0, Math.floor(i * band), width, Math.ceil(band));
    ctx.fillStyle = isDark(s.hex) ? "#ffffff" : "#111113";
    ctx.font = "600 44px ui-monospace, Menlo, monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(s.hex.toUpperCase(), 72, i * band + band / 2);
  });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function PalettePage() {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  // The sampled pixels of the current photo, kept so changing the colour count
  // re-runs extraction without decoding the photo again.
  const sampleRef = useRef<{ data: Uint8ClampedArray; width: number } | null>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [thumb, setThumb] = useState<string | undefined>(undefined);
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [count, setCount] = useState(DEFAULT_COLORS);
  const [shared, setShared] = useState(false);
  const [history, setHistory] = useState<PaletteHistory>(emptyHistory);
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped for every new palette so the reveal replays; `delay` is how long
  // it waits — a full beat for a new photo, none for a recount of the same one.
  const [reveal, setReveal] = useState({ key: 0, delay: DEVELOP_MS });

  useEffect(() => {
    setHistory(loadHistory(window.localStorage));
    const colors = decodeColors(new URLSearchParams(window.location.search).get("c"));
    if (colors.length > 0) {
      setSwatches(evenSwatches(colors));
      setShared(true);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (copied === null) return;
    const t = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  // Object URLs pin the full-size photo in memory until revoked.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  const updateHistory = useCallback((next: PaletteHistory) => {
    setHistory(next);
    writeHistory(window.localStorage, next);
  }, []);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      try {
        const { img, url } = await loadImage(file);
        const sample = shrink(img, SAMPLE_SIDE);
        const data = sample.getContext("2d")!.getImageData(0, 0, sample.width, sample.height).data;
        sampleRef.current = { data, width: sample.width };
        setPhoto({ url, width: img.naturalWidth, height: img.naturalHeight });
        setThumb(shrink(img, THUMB_SIDE).toDataURL("image/jpeg", 0.7));
        setSwatches(extractPalette(data, count, 1, sample.width));
        setShared(false);
        setActive(null);
        setReveal((r) => ({ key: r.key + 1, delay: DEVELOP_MS }));
        // A shared link's colours no longer describe what is on screen.
        window.history.replaceState(null, "", "/palette/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("That file couldn't be read as an image. Try a JPEG or PNG.");
      }
    },
    [count],
  );

  const changeCount = (n: number) => {
    setCount(n);
    const sample = sampleRef.current;
    if (!sample) return;
    setSwatches(extractPalette(sample.data, n, 1, sample.width));
    setActive(null);
    setReveal((r) => ({ key: r.key + 1, delay: 0 }));
  };

  const colors = swatches.map((s) => s.hex);
  const saved = colors.length > 0 ? findSaved(history, colors) : undefined;
  const accent = swatches[0]?.hex;

  const copyHex = async (i: number) => {
    const hex = swatches[i].hex.toUpperCase();
    setActive(i);
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(i);
      setToast(`Copied ${hex}`);
    } catch {
      setToast("Your browser blocked copying");
    }
  };

  const onSave = () => {
    if (saved) {
      updateHistory(removePalette(history, saved.id));
      setToast("Removed from saved");
      return;
    }
    updateHistory(
      addPalette(history, {
        id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
        colors,
        createdAt: Date.now(),
        thumb,
      }),
    );
    setToast("Saved to this phone");
  };

  const onShare = async () => {
    const url = shareUrl(window.location.origin, colors);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Palette", text: colors.join(" ").toUpperCase(), url });
        return;
      } catch (e) {
        // The person closed the share sheet; that is an answer, not a failure.
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Your browser blocked copying");
    }
  };

  const onDownload = async () => {
    const blob = await paletteCard(swatches);
    if (!blob) return;
    const file = new File([blob], "palette.png", { type: "image/png" });
    // On a phone the share sheet is where "Save Image" lives; a download link
    // there lands the PNG in a files app nobody looks in.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Palette" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palette.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openSaved = (id: string) => {
    const p = history.items.find((item) => item.id === id);
    if (!p) return;
    sampleRef.current = null;
    setPhoto(null);
    setThumb(p.thumb);
    setSwatches(evenSwatches(p.colors));
    setShared(false);
    setActive(null);
    setReveal((r) => ({ key: r.key + 1, delay: 0 }));
    window.history.replaceState(null, "", "/palette/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickFile = (input: HTMLInputElement | null) => input?.click();
  const fileInput = (ref: typeof cameraRef, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture ? "environment" : undefined}
      hidden
      onChange={(e) => {
        void onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const fan = history.items[0]?.colors ?? FAN_COLORS;
  const spread = (fan.length - 1) / 2;
  const themed = {
    ...(accent && {
      "--pal-accent": accent,
      "--pal-on-accent": isDark(accent) ? "#ffffff" : "#111113",
    }),
  } as CSSProperties;
  const revealStyle = { "--d": `${reveal.delay}ms`, "--n": swatches.length } as CSSProperties;

  return (
    <main className="pal" style={themed}>
      {fileInput(cameraRef, true)}
      {fileInput(uploadRef, false)}

      <div className="pal-wrap">
        <header className="pal-head">
          <Link href="/#projects" className="pal-iconlink">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden />
            Resume
          </Link>
          <span className="pal-wordmark">Palette</span>
          {swatches.length > 0 ? (
            <button
              type="button"
              className="pal-iconbtn"
              onClick={() => pickFile(cameraRef.current)}
              aria-label="Take a new photo"
            >
              <Camera size={20} strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <span className="w-11" aria-hidden />
          )}
        </header>

        {swatches.length === 0 ? (
          <section className="pal-intro">
            <h1>Pull the colours out of any photo.</h1>
            <p>Point your camera at something you like, or pick a picture you already have. It never leaves your phone.</p>

            <div className="pal-fan" aria-hidden>
              {fan.map((c, i) => (
                <span key={`${c}-${i}`} style={{ background: c, "--i": i - spread } as CSSProperties} />
              ))}
            </div>

            <div className="pal-choose">
              <button type="button" className="pal-btn pal-btn--ink" onClick={() => pickFile(cameraRef.current)}>
                <Camera size={19} strokeWidth={2} aria-hidden />
                Take a photo
              </button>
              <button type="button" className="pal-btn" onClick={() => pickFile(uploadRef.current)}>
                <ImageIcon size={19} strokeWidth={2} aria-hidden />
                Choose from library
              </button>
            </div>
            {error && <p className="pal-error">{error}</p>}
          </section>
        ) : (
          <>
            {shared && (
              <p className="pal-shared-note">
                Someone shared this palette with you. Take a photo to make your own.
              </p>
            )}

            <div className="pal-stage" style={revealStyle}>
              {photo ? (
                <figure
                  key={`photo-${photo.url}`}
                  className="pal-photo"
                  style={{
                    aspectRatio: `${photo.width} / ${photo.height}`,
                    width: `min(100%, calc(56dvh * ${photo.width / photo.height}))`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="Your photo" />
                  {swatches.map((s, i) =>
                    s.at ? (
                      <button
                        key={`${reveal.key}-${i}`}
                        type="button"
                        className="pal-pin"
                        data-active={active === i}
                        style={
                          {
                            left: `${s.at.x * 100}%`,
                            top: `${s.at.y * 100}%`,
                            background: s.hex,
                            "--i": i,
                          } as CSSProperties
                        }
                        onClick={() => setActive(i)}
                        aria-label={`${s.hex.toUpperCase()} is found here`}
                      />
                    ) : null,
                  )}
                </figure>
              ) : (
                <div key={`bands-${reveal.key}`} className="pal-bands">
                  {swatches.map((s, i) => (
                    <span key={`${s.hex}-${i}`} className="flex-1" style={{ background: s.hex }} />
                  ))}
                </div>
              )}
            </div>

            {photo && (
              <div key={`strip-${reveal.key}`} className="pal-strip" style={revealStyle} aria-hidden>
                {swatches.map((s, i) => (
                  <span key={`${s.hex}-${i}`} style={{ background: s.hex, flexGrow: s.weight, flexBasis: 0 }} />
                ))}
              </div>
            )}

            {error && <p className="pal-error">{error}</p>}

            <section className="pal-section">
              <div className="pal-row">
                <h2>{swatches.length} colours</h2>
                {sampleRef.current && (
                  <div className="pal-count" role="group" aria-label="How many colours">
                    {COUNTS.map((n) => (
                      <button key={n} type="button" aria-pressed={count === n} onClick={() => changeCount(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div key={`list-${reveal.key}`} className="pal-list" style={revealStyle}>
                {swatches.map((s, i) => (
                  <button
                    key={`${s.hex}-${i}`}
                    type="button"
                    className="pal-swatch"
                    data-active={active === i}
                    style={{ "--i": i } as CSSProperties}
                    onClick={() => void copyHex(i)}
                    aria-label={`Copy ${s.hex.toUpperCase()}`}
                  >
                    <span className="pal-chip" style={{ background: s.hex }} aria-hidden />
                    <span>
                      <span className="pal-hex block">{s.hex.toUpperCase()}</span>
                      <span className="pal-meta block">
                        {photo ? `${Math.max(1, Math.round(s.weight * 100))}% · ` : ""}
                        {rgbText(s.hex)}
                      </span>
                    </span>
                    <span className="pal-copy" aria-hidden>
                      {copied === i ? <Check size={18} strokeWidth={2.25} /> : <Copy size={18} strokeWidth={2} />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {history.items.length > 0 && (
          <section className="pal-section">
            <div className="pal-row">
              <h2>Saved</h2>
              <span className="pal-meta">{history.items.length} on this phone</span>
            </div>
            <ul className="pal-saved">
              {history.items.map((p) => (
                <li key={p.id} className="pal-saved-item">
                  <button
                    type="button"
                    className="pal-saved-open"
                    onClick={() => openSaved(p.id)}
                    aria-label={`Open saved palette ${p.colors.join(", ")}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.thumb && <img src={p.thumb} alt="" />}
                    {p.colors.map((c, i) => (
                      <span key={`${c}-${i}`} style={{ background: c }} />
                    ))}
                  </button>
                  <button
                    type="button"
                    className="pal-iconbtn"
                    onClick={() => updateHistory(removePalette(history, p.id))}
                    aria-label="Delete this saved palette"
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <a href={SOURCE_URL} target="_blank" rel="noopener" className="pal-foot">
          The original Android app, 2019
        </a>

        {swatches.length > 0 && (
          <div className="pal-bar">
            <div className="pal-bar-grid">
              <button type="button" className="pal-btn" onClick={onSave} aria-pressed={Boolean(saved)}>
                {saved ? (
                  <BookmarkCheck size={19} strokeWidth={2} aria-hidden />
                ) : (
                  <Bookmark size={19} strokeWidth={2} aria-hidden />
                )}
                {saved ? "Saved" : "Save"}
              </button>
              <button type="button" className="pal-btn pal-btn--primary" onClick={() => void onShare()}>
                <Share2 size={19} strokeWidth={2} aria-hidden />
                Share
              </button>
              <button type="button" className="pal-btn" onClick={() => void onDownload()}>
                <Download size={19} strokeWidth={2} aria-hidden />
                Image
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pal-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
