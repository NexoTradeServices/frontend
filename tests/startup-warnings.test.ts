// Feature 1015, every outside service announces itself at boot -- AC4 and AC5 (frontend, unit).
//
// AC4  no Places key: one `places:` line; no site key: one `recaptcha:` line; both: both
// AC5  both set: no line
//
// "The build still succeeds" is proven by CI's build step, which runs without the keys.
import { describe, expect, test } from "vitest";
import { startupWarnings } from "../src/lib/startup-warnings";

const PLACES = "places: NEXT_PUBLIC_GOOGLE_PLACES_KEY is not set -- address fields cannot look up addresses until it is";
const RECAPTCHA = "recaptcha: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set -- web enquiries are not bot-checked until it is";

describe("AC4 -- a missing key is named", () => {
  test("no Places key", () => {
    expect(startupWarnings({ NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site" })).toEqual([PLACES]);
  });

  test("no site key", () => {
    expect(startupWarnings({ NEXT_PUBLIC_GOOGLE_PLACES_KEY: "places" })).toEqual([RECAPTCHA]);
  });

  test("both missing, a blank value counts as missing", () => {
    expect(startupWarnings({ NEXT_PUBLIC_GOOGLE_PLACES_KEY: "  " })).toEqual([PLACES, RECAPTCHA]);
  });
});

describe("AC5 -- both set", () => {
  test("no line", () => {
    expect(startupWarnings({ NEXT_PUBLIC_GOOGLE_PLACES_KEY: "places", NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site" })).toEqual([]);
  });
});
