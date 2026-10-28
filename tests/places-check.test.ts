// Feature 6012, service status page -- the Google Places row (unit, Vitest).
//
// AC5  Places is checked from the browser with one lookup: up when it answers, down when the
//      script or the lookup fails or nothing answers in 5 seconds, not set up with no key.
//
// The browser's `window.google` is faked here; nothing reaches Google.
import { afterEach, describe, expect, test, vi } from "vitest";
import { PLACES_REASON_TIMEOUT, PLACES_REASON_UNREACHED, PLACES_TIMEOUT_MS, checkPlaces } from "../src/lib/places-check";

function fakeBrowser(fetchAutocompleteSuggestions: (request: { input: string }) => Promise<unknown>) {
  vi.stubGlobal("window", { google: { maps: { places: { AutocompleteSuggestion: { fetchAutocompleteSuggestions } } } } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AC5 -- the Places row", () => {
  test("no key -> not set up, and nothing is looked up", async () => {
    const lookup = vi.fn(() => Promise.resolve({ suggestions: [] }));
    fakeBrowser(lookup);
    expect(await checkPlaces(undefined)).toEqual({ state: "not_set_up" });
    expect(await checkPlaces("   ")).toEqual({ state: "not_set_up" });
    expect(lookup).not.toHaveBeenCalled();
  });

  test("one lookup for 'Perth' that answers -> up", async () => {
    const lookup = vi.fn((request: { input: string }) => {
      void request;
      return Promise.resolve({ suggestions: [] });
    });
    fakeBrowser(lookup);
    expect(await checkPlaces("a-key")).toEqual({ state: "up" });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup.mock.calls[0]?.[0]).toMatchObject({ input: "Perth" });
  });

  test("a lookup that fails -> down", async () => {
    fakeBrowser(() => Promise.reject(new Error("network down")));
    expect(await checkPlaces("a-key")).toEqual({ state: "down", reason: PLACES_REASON_UNREACHED });
  });

  test("a lookup that never answers -> down, 'No answer within 5 seconds'", async () => {
    vi.useFakeTimers();
    fakeBrowser(() => new Promise(() => undefined));
    const result = checkPlaces("a-key");
    await vi.advanceTimersByTimeAsync(PLACES_TIMEOUT_MS + 1);
    expect(await result).toEqual({ state: "down", reason: PLACES_REASON_TIMEOUT });
  });
});
