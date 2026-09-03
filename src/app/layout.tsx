import type { Metadata } from "next";
import { Archivo, Geist_Mono, Public_Sans } from "next/font/google";
import { getDisplayName } from "@/lib/identity";
import "./globals.css";

// Foundations typography (frontend-conventions.md, section B): Archivo for
// headings, Public Sans for body -- two fonts, nothing else.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Feature 1014, brand strings go to config: the tab title reads the config
// home. Decision 6 -- if the identity read fails, the title falls back to
// nothing brand-bearing (an empty string) rather than holding a name of its
// own; the page still loads either way.
export async function generateMetadata(): Promise<Metadata> {
  const displayName = await getDisplayName();
  return {
    title: displayName ?? "",
    description: "Managed trades platform for Perth, WA.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${publicSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
