import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

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
          defaultTheme="dark"
          enableSystem={true}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
