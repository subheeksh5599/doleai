import type { Metadata } from "next";
import { Bricolage_Grotesque, Spline_Sans_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { DitherArt } from "@/components/DitherArt";
import { Header } from "@/components/Header";

// Display grotesque (headings), pixel accent (wordmark), and the terminal mono
// that carries all data. Mirrors the TAPE design system.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});
const mono = Spline_Sans_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DoleAI — the income is attested",
  description:
    "AI-attested RWA revenue on BOT Chain. Agents verify real income events on-chain, then distribute to holders — evidence on the record, never a spreadsheet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        {/* ambient dither behind everything: living paper grain */}
        <div aria-hidden className="app-dither">
          <DitherArt shape="field" gap={5} className="h-full w-full" />
        </div>
        <Header />
        {children}
      </body>
    </html>
  );
}
