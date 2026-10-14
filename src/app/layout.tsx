import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { getIdentity, isIndexableHost } from "@/lib/identity";
import "./globals.css";

// Foundations typography (frontend-conventions.md, section B): Archivo for
// headings, Public Sans for body -- two fonts, nothing else. Bundled in
// src/fonts/ and served from the app itself, never fetched from Google
// (decision 0007). One variable file per family covers every weight.
const archivo = localFont({
  src: "../fonts/Archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "700 900",
});

const publicSans = localFont({
  src: "../fonts/PublicSans-latin-variable.woff2",
  variable: "--font-public-sans",
  weight: "400 700",
});

// Feature 1014, brand strings go to config: the tab title reads the config
// home. Decision 6 -- if the identity read fails, the title falls back to
// nothing brand-bearing (an empty string) rather than holding a name of its
// own; the page still loads either way.
//
// Feature 8002, the Google-visibility fail-safe: every page says noindex,
// nofollow unless the host it was served on is exactly the approved public
// domain the owner typed on Settings. Blank, a mismatch, or a failed identity
// read all stay hidden. Child pages may only hide MORE (the capability pages
// set their own noindex); no page sets index: true. There is no robots.txt on
// purpose: a file that blocked crawling would stop Google ever seeing this.
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getIdentity();
  const host = (await headers()).get("host");
  return {
    title: identity?.displayName ?? "",
    description: "Managed trades platform for Perth, WA.",
    ...(isIndexableHost(host, identity) ? {} : { robots: { index: false, follow: false } }),
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
      className={`${archivo.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
