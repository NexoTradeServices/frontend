// The Public shell's layout file -- Feature 1018; Templates / Shells.
//
// One layout over the marketing pages: Top bar, Main slot, Footer. No page
// sits under it yet; the first marketing page to be built is its first user.
// The Footer reads the business name and phone from the identity read.
import type { ReactNode } from "react";
import { PublicShell } from "@/components/frame/public-shell";
import { getIdentity } from "@/lib/identity";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const identity = await getIdentity();
  return (
    <PublicShell displayName={identity?.displayName ?? null} phone={identity?.operatorPhone ?? null}>
      {children}
    </PublicShell>
  );
}
