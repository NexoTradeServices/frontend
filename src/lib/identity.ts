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
}

export const getIdentity = cache(async (): Promise<Identity | null> => {
  try {
    const res = await fetch(`${apiUrl}/api/identity`, { cache: "no-store" });
    if (res.status !== 200) return null;
    const body = (await res.json()) as { displayName: string; operatorPhone?: string };
    return {
      displayName: body.displayName,
      operatorPhone: typeof body.operatorPhone === "string" && body.operatorPhone !== "" ? body.operatorPhone : null,
    };
  } catch {
    return null;
  }
});

export async function getDisplayName(): Promise<string | null> {
  return (await getIdentity())?.displayName ?? null;
}
