// Server-side identity read -- Feature 1014, brand strings go to config.
//
// The getSessionUser pattern: one server helper, called from Server
// Components, reading the backend's public GET /api/identity (no cookies --
// the endpoint needs no session, Foundations / Brand identity decision 4).
//
// Decision 6: if the read fails, this returns null and callers render the
// wordmark slot empty. The frontend never holds a fallback name of its own.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function getDisplayName(): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/api/identity`, { cache: "no-store" });
    if (res.status !== 200) return null;
    const body = (await res.json()) as { displayName: string };
    return body.displayName;
  } catch {
    return null;
  }
}
