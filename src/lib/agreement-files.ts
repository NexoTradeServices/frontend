// Opening an agreement file -- Feature 2006.
//
// Files never have a public address: the backend checks who is asking, then
// answers with a short-lived signed address, which opens in a new tab. The
// tab is opened straight away, inside the click, so a phone's pop-up blocker
// lets it through, and pointed at the file once the address arrives.
import { formatDate } from "./date-format";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const OPEN_FAILED = "Couldn't open the file - try again shortly.";

/** Opens `path` (an endpoint answering { url }) in a new tab. Resolves to an error line, or null when it opened. */
export async function openSignedFile(path: string): Promise<string | null> {
  const tab = window.open("", "_blank");
  try {
    const res = await fetch(`${apiUrl}${path}`, { credentials: "include" });
    if (!res.ok) {
      tab?.close();
      return OPEN_FAILED;
    }
    const { url } = (await res.json()) as { url: string };
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
    return null;
  } catch {
    tab?.close();
    return OPEN_FAILED;
  }
}

/** "9 Sep 2026" in the business's own clock (the shared date writer). */
export function friendlyDate(iso: string, timezone: string): string {
  return formatDate(iso, timezone);
}
