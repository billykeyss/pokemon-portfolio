import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Yichen Huang | Software Engineer",
  description:
    "Software Development Engineer with expertise in full-stack development, IoT, AI, and robotics. Portfolio showcasing projects and professional experience.",
  keywords: [
    "Yichen Huang",
    "Software Engineer",
    "Full Stack Developer",
    "AI Engineer",
    "Robotics Engineer",
    "Web Development",
    "Portfolio",
  ],
  authors: [{ name: "Yichen Huang" }],
  openGraph: {
    title: "Yichen Huang | Software Engineer",
    description:
      "Software Development Engineer with expertise in full-stack development, IoT, AI, and robotics.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
