import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono, Young_Serif } from "next/font/google";
import "./globals.css";

const sans = Hanken_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const serif = Young_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });
const brand = Bricolage_Grotesque({ variable: "--font-brand", subsets: ["latin"], weight: "700" });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "White Blazes",
  description: "Track your Bruce Trail hikes, Niagara to Tobermory.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} ${brand.variable}`}>{children}</body>
    </html>
  );
}
