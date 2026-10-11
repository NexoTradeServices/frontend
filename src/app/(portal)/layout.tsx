// The Portal shell's layout file -- Feature 1018; Templates / Shells.
//
// One layout over /ops, /contractor and /account: the ONE place the Portal
// frame and the login gate are drawn. It reads who is logged in once, and
// the PortalShell client component (which can read the URL) decides what to
// draw. A page under it never draws a frame, a title bar or a login check of
// its own.
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { getDisplayName } from "@/lib/identity";
import { getSessionUser } from "@/lib/session";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  return (
    <PortalShell user={user} displayName={displayName}>
      {children}
    </PortalShell>
  );
}
