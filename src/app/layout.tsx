import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SLOGAN } from "@/lib/constants";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `SkillSwap — ${SLOGAN}`,
    template: "%s · SkillSwap",
  },
  description:
    "A student skill exchange. Teach what you know, earn time credits, and spend them learning anything else — no money involved.",
  keywords: [
    "skill exchange",
    "student tutoring",
    "time credits",
    "peer learning",
    "study help",
  ],
  openGraph: {
    title: `SkillSwap — ${SLOGAN}`,
    description:
      "Teach an hour, learn an hour. A verified, student-only exchange for tutoring and skill-building.",
    type: "website",
    siteName: "SkillSwap",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#040b16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
