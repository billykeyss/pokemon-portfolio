import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./palette.css";

// Palette is a standalone tool, not part of the arcade's pixel world, so it
// gets its own faces: Geist for the interface, Geist Mono for hex values,
// which are data and read better with fixed-width digits.
const sans = localFont({ src: "../fonts/GeistVF.woff", variable: "--pal-sans", weight: "100 900" });
const mono = localFont({ src: "../fonts/GeistMonoVF.woff", variable: "--pal-mono", weight: "100 900" });

export const metadata: Metadata = {
  title: "Palette · Bill Huang",
  description: "Pull a colour palette out of any photo. Save it, share it, keep it.",
};

export const viewport: Viewport = {
  themeColor: "#ededeb",
  viewportFit: "cover",
};

export default function PaletteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} ${mono.variable}`}>{children}</div>;
}
