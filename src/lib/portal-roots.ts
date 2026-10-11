// Which root each role owns -- Feature 1003, auth + roles (AC11).
//
// Architecture & Routing / The doors: ops and the owner share one portal.
import type { Role } from "./session";

export const PORTAL_ROOTS: Record<Role, string> = {
  customer: "/account",
  contractor: "/contractor",
  ops: "/ops",
  owner: "/ops",
};

export const PORTAL_NAMES: Record<Role, string> = {
  customer: "Customer account",
  contractor: "Contractor portal",
  ops: "Operations portal",
  owner: "Operations portal",
};

// Feature 1018: the three portals as the Portal shell sees them. A layout
// does not see the URL, so the shell reads the path and finds its portal here.
export type PortalKey = "ops" | "contractor" | "account";

export const PORTALS: Record<PortalKey, { root: string; name: string; roles: readonly Role[] }> = {
  ops: { root: "/ops", name: "Operations portal", roles: ["ops", "owner"] },
  contractor: { root: "/contractor", name: "Contractor portal", roles: ["contractor"] },
  account: { root: "/account", name: "Customer account", roles: ["customer"] },
};

export function portalForPath(pathname: string): PortalKey | null {
  for (const key of Object.keys(PORTALS) as PortalKey[]) {
    const { root } = PORTALS[key];
    if (pathname === root || pathname.startsWith(`${root}/`)) return key;
  }
  return null;
}
