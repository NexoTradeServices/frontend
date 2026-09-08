// Stands in for Google Places in CI only -- project/setup/
// frontend-test-harness.md Part 3. The owner's real key is printed on the
// live page (it has to be, browser keys always are) and referrer-restricted
// to idelta.com.au; that restriction is the ONLY thing stopping a stranger
// who reads it off the page from using it, so it is never widened to allow
// a CI runner's localhost, and the real key is never put in GitHub either.
// CI instead sets NEXT_PUBLIC_GOOGLE_PLACES_KEY to a non-empty placeholder
// (never sent anywhere -- it only exists so PlacesField doesn't read a
// blank key as "unavailable" from first render) and this fakes the rest.
//
// Two things need faking, not one: src/components/ui/places-field.tsx's
// own loader checks `window.google.maps.places` BEFORE it ever appends the
// real <script src="https://maps.googleapis.com/..."> tag -- pre-seeding it
// here means that request is never made at all, so a script failure can
// never disable the field. The autocomplete pick itself is the second.
//
// Locally (no CI env var), this is never installed -- every real-Places
// test keeps calling the real Google API exactly as before.
import type { Page } from "@playwright/test";

export const MOCKS_GOOGLE_PLACES = !!process.env.CI;

interface MockPlace {
  /** Lowercase substring of the typed input this entry answers to. */
  match: string;
  suggestionText: string;
  placeId: string;
  components: { longText: string; shortText: string; types: string[] }[];
  lat: number;
  lng: number;
}

// Checked in order -- "marine terrace" before "fremantle" so a full street
// pick (contractors.spec.ts AC11) matches the street entry, not the plain
// suburb one underneath it. Real, approximate WA coordinates for Fremantle
// and Joondalup: only the Google round trip is faked here, so the backend's
// own (real, un-mocked) /api/suburbs/in-range PostGIS query still returns
// genuinely different postcode sets for the two, which is what
// service-area.spec.ts's AC4/AC5 actually proves.
const MOCK_PLACES: MockPlace[] = [
  {
    match: "marine terrace",
    suggestionText: "14 Marine Terrace, Fremantle WA 6160, Australia",
    placeId: "mock-place-14-marine-terrace",
    components: [
      { longText: "14", shortText: "14", types: ["street_number"] },
      { longText: "Marine Terrace", shortText: "Marine Terrace", types: ["route"] },
      { longText: "Fremantle", shortText: "Fremantle", types: ["locality"] },
      { longText: "Western Australia", shortText: "WA", types: ["administrative_area_level_1"] },
      { longText: "Australia", shortText: "AU", types: ["country"] },
      { longText: "6160", shortText: "6160", types: ["postal_code"] },
    ],
    lat: -32.0569,
    lng: 115.7439,
  },
  {
    match: "fremantle",
    suggestionText: "Fremantle WA, Australia",
    placeId: "mock-place-fremantle",
    components: [
      { longText: "Fremantle", shortText: "Fremantle", types: ["locality"] },
      { longText: "Western Australia", shortText: "WA", types: ["administrative_area_level_1"] },
      { longText: "Australia", shortText: "AU", types: ["country"] },
      { longText: "6160", shortText: "6160", types: ["postal_code"] },
    ],
    lat: -32.0569,
    lng: 115.7439,
  },
  {
    match: "joondalup",
    suggestionText: "Joondalup WA, Australia",
    placeId: "mock-place-joondalup",
    components: [
      { longText: "Joondalup", shortText: "Joondalup", types: ["locality"] },
      { longText: "Western Australia", shortText: "WA", types: ["administrative_area_level_1"] },
      { longText: "Australia", shortText: "AU", types: ["country"] },
      { longText: "6027", shortText: "6027", types: ["postal_code"] },
    ],
    lat: -31.7454,
    lng: 115.7654,
  },
];

/** Pre-seeds `window.google.maps.places` before any page script runs, so
 * PlacesField's own loader sees the library already present and never
 * requests maps.googleapis.com at all -- call before `page.goto`. */
export async function installMockGooglePlaces(page: Page): Promise<void> {
  await page.addInitScript((places: MockPlace[]) => {
    function findMatch(input: string) {
      const lower = input.toLowerCase();
      return places.find((p) => lower.includes(p.match));
    }

    window.google = {
      maps: {
        places: {
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: (request: { input: string }) => {
              const found = findMatch(request.input);
              if (!found) return Promise.resolve({ suggestions: [] });
              return Promise.resolve({
                suggestions: [
                  {
                    placePrediction: {
                      placeId: found.placeId,
                      text: { text: found.suggestionText },
                      toPlace: () => ({
                        id: found.placeId,
                        addressComponents: found.components,
                        location: { lat: () => found.lat, lng: () => found.lng },
                        fetchFields: () => Promise.resolve({}),
                      }),
                    },
                  },
                ],
              });
            },
          },
        },
      },
    };
  }, MOCK_PLACES);
}
