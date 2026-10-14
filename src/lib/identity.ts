// Server-side identity read -- Feature 1014, brand strings go to config;
// Feature 1018 adds the support phone the Footer shows.
//
// The getSessionUser pattern: one server helper, called from Server
// Components, reading the backend's public GET /api/identity (no cookies --
// the endpoint needs no session, Foundations / Brand identity decision 4).
//
// Decision 6: if the read fails, this returns null and callers render the
// wordmark slot (and the Footer's name and phone) empty. The frontend never
// holds a fallback name of its own.
import { cache } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface Identity {
  displayName: string;
  /** The support phone, as the owner typed it on Settings. */
  operatorPhone: string | null;
  /**
   * Feature 8002: the one host search engines may list, as the owner typed it
   * on Settings. null = blank = every site stays invisible.
   */
  approvedPublicDomain: string | null;
}

export const getIdentity = cache(async (): Promise<Identity | null> => {
  try {
    const res = await fetch(`${apiUrl}/api/identity`, { cache: "no-store" });
    if (res.status !== 200) return null;
    const body = (await res.json()) as {
      displayName: string;
      operatorPhone?: string;
      approvedPublicDomain?: unknown;
    };
    return {
      displayName: body.displayName,
      operatorPhone: typeof body.operatorPhone === "string" && body.operatorPhone !== "" ? body.operatorPhone : null,
      approvedPublicDomain:
        typeof body.approvedPublicDomain === "string" && body.approvedPublicDomain !== ""
          ? body.approvedPublicDomain
          : null,
    };
  } catch {
    return null;
  }
});

export async function getDisplayName(): Promise<string | null> {
  return (await getIdentity())?.displayName ?? null;
}

/**
 * Feature 8002, the Google-visibility fail-safe: true ONLY when the identity
 * was read, the owner has typed an approved domain, and the host the page was
 * served on is exactly that domain (lower-cased, port stripped). Blank, a
 * mismatch, or a failed identity read all mean false -- never the other way.
 * `www.` is not special: only the exact domain typed opens up.
 */
export function isIndexableHost(host: string | null | undefined, identity: Identity | null): boolean {
  if (identity === null || identity.approvedPublicDomain === null) return false;
  if (typeof host !== "string" || host === "") return false;
  const bare = host.trim().toLowerCase().replace(/:\d+$/, "");
  return bare !== "" && bare === identity.approvedPublicDomain.trim().toLowerCase();
}
