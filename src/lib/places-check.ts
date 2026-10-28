// Feature 6012 -- is Google Places answering, from the browser: the key is the browser's own.
//
// Loads the Places script with the browser key and makes ONE lookup for "Perth".
// An answer is up; a failed load, a failed call or no answer in 5 seconds is down;
// no key is not set up. Reads and sends nothing else, stores nothing.
import { loadPlacesScript } from "@/components/ui/places-field";
import type { ServiceState } from "@/components/service-status/types";

export const PLACES_TIMEOUT_MS = 5_000;
export const PLACES_REASON_TIMEOUT = "No answer within 5 seconds";
export const PLACES_REASON_REFUSED = "The key was refused";
export const PLACES_REASON_UNREACHED = "Could not be reached";

export interface PlacesCheckResult {
  state: ServiceState;
  reason?: string;
}

export async function checkPlaces(apiKey: string | undefined): Promise<PlacesCheckResult> {
  if (!apiKey?.trim()) return { state: "not_set_up" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), PLACES_TIMEOUT_MS);
  });
  const lookup = (async (): Promise<PlacesCheckResult> => {
    try {
      await loadPlacesScript(apiKey);
      const places = window.google?.maps?.places;
      if (!places) return { state: "down", reason: PLACES_REASON_UNREACHED };
      await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: "Perth", includedRegionCodes: ["au"] });
      return { state: "up" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return { state: "down", reason: /key|denied|referer|forbidden/i.test(message) ? PLACES_REASON_REFUSED : PLACES_REASON_UNREACHED };
    }
  })();
  const result = await Promise.race([lookup, timedOut]);
  if (timer) clearTimeout(timer);
  return result === "timeout" ? { state: "down", reason: PLACES_REASON_TIMEOUT } : result;
}
