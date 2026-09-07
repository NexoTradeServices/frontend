// Google Places field -- frontend-conventions.md, Components / Google
// Places field; Feature 2001, contractor onboarding (Mike's path), plan
// decision 11 and AC11. The first screen to use it.
//
// A text field that suggests as you type; the person picks a match and the
// STRUCTURED pick is stored (street/suburb/state/country/postcode/lat/lng/
// placeId) -- typed text left unpicked is never saved as an address
// (Location capture rule). Two states beyond the happy path, both AC11:
//   - the key is missing, or the script fails to load -> the field is
//     disabled with the warning-color line, and the rest of the screen
//     still saves.
//   - typed text with no pick, on blur -> a field error asking to pick from
//     the list or clear it.
// Uses AutocompleteSuggestion/Place (the current Places API), not the
// classic AutocompleteService/PlacesService pair: this project's Google
// Cloud project only has Places API (New) enabled (project/setup/
// 01-dev-environment.md, section 6), and the classic pair returns
// REQUEST_DENIED against it -- confirmed live against the real key, not
// assumed (Google's own console warning: "As of March 1st, 2025,
// ...AutocompleteService is not available to new customers").
"use client";

import { useEffect, useRef, useState } from "react";

export interface PickedAddress {
  street: string;
  suburb: string;
  state: string;
  country: string;
  postcode: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface GoogleAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface GooglePlace {
  id?: string;
  addressComponents?: GoogleAddressComponent[];
  location?: { lat(): number; lng(): number };
  fetchFields(request: { fields: string[] }): Promise<unknown>;
}

interface GooglePlacePrediction {
  placeId: string;
  text: { text: string };
  toPlace(): GooglePlace;
}

interface GoogleAutocompleteSuggestion {
  placePrediction: GooglePlacePrediction | null;
}

interface GoogleAutocompleteSuggestionNamespace {
  fetchAutocompleteSuggestions(request: {
    input: string;
    includedRegionCodes?: string[];
  }): Promise<{ suggestions: GoogleAutocompleteSuggestion[] }>;
}

interface GoogleMapsPlacesNamespace {
  AutocompleteSuggestion: GoogleAutocompleteSuggestionNamespace;
}

declare global {
  interface Window {
    google?: { maps?: { places?: GoogleMapsPlacesNamespace } };
  }
}

const SCRIPT_ID = "google-places-script";
type LoadState = "checking" | "unavailable" | "ready";

// A global name, not the script tag's own `load` event: with `loading=async`
// the outer <script> finishes downloading (and fires `load`) BEFORE Google's
// own bootstrap has pulled in the places sub-modules it dynamically imports
// after that -- `google.maps.places` is still undefined at that point. The
// `callback` query param is Google's own documented signal for "the
// requested libraries are actually ready" (see the places-migration guide
// the console warns about); this is what a same-page second mount, or a
// React Strict Mode double-invoke, waits behind too.
const CALLBACK_NAME = "__tradeserviceGooglePlacesReady";

function loadPlacesScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    const callbacks = window as unknown as Record<string, (() => void) | undefined>;
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const previous = callbacks[CALLBACK_NAME];
      callbacks[CALLBACK_NAME] = () => {
        previous?.();
        resolve();
      };
      existing.addEventListener("error", () => reject(new Error("google places script failed to load")));
      return;
    }
    callbacks[CALLBACK_NAME] = () => resolve();
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.addEventListener("error", () => reject(new Error("google places script failed to load")));
    document.head.appendChild(script);
  });
}

function componentOf(components: GoogleAddressComponent[], type: string, short = false): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return "";
  return short ? match.shortText : match.longText;
}

function toPickedAddress(place: GooglePlace): PickedAddress | null {
  const components = place.addressComponents;
  const location = place.location;
  if (!components || !location || !place.id) return null;
  const streetNumber = componentOf(components, "street_number");
  const route = componentOf(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  const suburb = componentOf(components, "locality") || componentOf(components, "sublocality");
  const state = componentOf(components, "administrative_area_level_1", true);
  const country = componentOf(components, "country", true);
  const postcode = componentOf(components, "postal_code");
  return {
    street,
    suburb,
    state,
    country,
    postcode,
    lat: location.lat(),
    lng: location.lng(),
    placeId: place.id,
  };
}

export function fullAddress(a: PickedAddress): string {
  const parts = [a.street, a.suburb].filter(Boolean).join(", ");
  return [parts, [a.state, a.postcode].filter(Boolean).join(" ")].filter(Boolean).join(" ");
}

export function PlacesField({
  id,
  label,
  optional,
  value,
  onChange,
  error,
  onErrorChange,
  onPickingChange,
}: {
  id: string;
  label: string;
  optional?: boolean;
  value: PickedAddress | null;
  onChange: (value: PickedAddress | null) => void;
  error?: string;
  onErrorChange: (error: string | undefined) => void;
  /**
   * Fires true the instant a suggestion is clicked, false once that pick's
   * network round-trip (fetchFields) settles either way. The visible text
   * updates before that round-trip finishes; a caller that lets Save fire
   * in that window saves with the address still unset underneath -- the
   * form uses this to hold Save off until the pick actually lands.
   */
  onPickingChange?: (picking: boolean) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  const [state, setState] = useState<LoadState>(apiKey ? "checking" : "unavailable");
  const [inputValue, setInputValue] = useState(value ? fullAddress(value) : "");
  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const namespaceRef = useRef<GoogleAutocompleteSuggestionNamespace | null>(null);
  const pickedRef = useRef(value !== null);
  // Each keystroke fires its own async lookup; only the LATEST one may
  // update state -- a slow earlier response landing after a faster later
  // one would otherwise flash stale suggestions back onto the screen.
  const requestIdRef = useRef(0);
  // Clicking a suggestion blurs the input (mousedown) before pick()'s own
  // network call (fetchFields) resolves. A fixed short delay on the blur
  // check can't tell "mid-pick" from "typed and walked away" -- this flag
  // does, so the blur handler defers to the pick in flight instead of
  // guessing wrong under real network latency.
  const pickingRef = useRef(false);

  // Re-sync the displayed text when `value` changes for a reason OTHER than
  // this field's own typing/picking (a different contractor loaded) --
  // adjusted during render, not an effect, per React's own guidance for
  // "state that depends on a prop" (avoids the extra render an effect costs).
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setInputValue(value ? fullAddress(value) : "");
  }

  useEffect(() => {
    pickedRef.current = value !== null;
  }, [value]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadPlacesScript(apiKey)
      .then(() => {
        if (cancelled) return;
        const places = window.google?.maps?.places;
        if (!places) {
          setState("unavailable");
          return;
        }
        namespaceRef.current = places.AutocompleteSuggestion;
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  function handleInput(next: string) {
    setInputValue(next);
    pickedRef.current = false;
    onChange(null);
    onErrorChange(undefined);
    if (state !== "ready" || next.trim().length < 3 || !namespaceRef.current) {
      setPredictions([]);
      setSuggOpen(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    namespaceRef.current
      .fetchAutocompleteSuggestions({ input: next, includedRegionCodes: ["au"] })
      .then((result) => {
        if (requestId !== requestIdRef.current) return; // superseded by a later keystroke
        const withPredictions = result.suggestions
          .map((s) => s.placePrediction)
          .filter((p): p is GooglePlacePrediction => p !== null);
        setPredictions(withPredictions);
        setSuggOpen(true);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setSuggOpen(true);
      });
  }

  function pick(prediction: GooglePlacePrediction) {
    pickingRef.current = true;
    onPickingChange?.(true);
    const place = prediction.toPlace();
    place
      .fetchFields({ fields: ["id", "addressComponents", "location"] })
      .then(() => {
        const picked = toPickedAddress(place);
        if (!picked) return;
        pickedRef.current = true;
        setInputValue(fullAddress(picked));
        setSuggOpen(false);
        onChange(picked);
        onErrorChange(undefined);
      })
      .catch(() => {
        // A genuine failure -- fall through to the same "unpicked" error
        // handleBlur would have set, now that the pick is actually over.
        if (inputValue.trim() !== "" && !pickedRef.current) {
          onErrorChange("Pick the address from the list, or clear the field.");
        }
      })
      .finally(() => {
        pickingRef.current = false;
        onPickingChange?.(false);
      });
  }

  function handleBlur() {
    setTimeout(() => {
      setSuggOpen(false);
      // A pick is still resolving (real network call, can outlast a fixed
      // delay) -- its own .then()/.catch() decides the error, not this
      // stale guess.
      if (pickingRef.current) return;
      if (inputValue.trim() !== "" && !pickedRef.current) {
        onErrorChange("Pick the address from the list, or clear the field.");
      }
    }, 150);
  }

  const unavailable = state === "unavailable";
  // Disabled for BOTH "checking" and "unavailable" -- only "ready" means
  // namespaceRef.current actually holds the library. A field that reads as
  // enabled the instant it mounts (the old bound: only `unavailable`
  // disabled it) lets someone start typing before the script has finished
  // loading; handleInput's own `state !== "ready"` guard would then just
  // silently drop that keystroke's lookup -- found by the e2e suite typing
  // immediately after `toBeEnabled()`, which was true from first paint.
  const notReady = state !== "ready";

  return (
    <div className="relative mb-3.5">
      <label htmlFor={id} className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">
        {label}
        {optional ? <span className="font-normal tracking-normal normal-case"> (optional)</span> : null}
      </label>
      <input
        id={id}
        className={`min-h-[44px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:bg-ground disabled:text-muted-text ${
          error ? "border-brand-destructive" : "border-hairline"
        }`}
        placeholder="Start typing, then pick the match"
        autoComplete="off"
        disabled={notReady}
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        aria-invalid={error ? true : undefined}
      />
      {suggOpen && !unavailable ? (
        <div className="absolute inset-x-0 top-full z-10 overflow-hidden rounded-b-md border border-t-0 border-hairline bg-surface shadow-lg">
          <div className="px-3 pt-1.5 pb-0.5 text-[11px] tracking-[0.08em] text-muted-text uppercase">
            Google suggestions
          </div>
          {predictions.length === 0 ? (
            <div className="px-3 py-2.5 text-[13px] text-muted-text">No match. Keep typing, or check the spelling.</div>
          ) : (
            predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => pick(prediction)}
                className="block w-full border-0 bg-none px-3 py-2.5 text-left text-sm text-ink hover:bg-ground"
              >
                {prediction.text.text}
              </button>
            ))
          )}
        </div>
      ) : null}
      {error ? (
        <p className="mt-[5px] text-xs text-brand-destructive">{error}</p>
      ) : unavailable ? (
        <p className="mt-[5px] text-xs text-brand-warning">
          Address lookup is unavailable right now -- try again shortly. Everything else still saves.
        </p>
      ) : null}
    </div>
  );
}
