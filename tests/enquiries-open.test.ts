// Feature 3006, the enquiry form safe when Google is missing -- AC3 (unit).
//
// AC3  the page shows only the Alert strip when form-data says takingEnquiries
//      is false, or when it is the live Vercel site with no site key; with both
//      keys present, or off the live site, the form shows as today.
//
// The page itself cannot be served as the live site in a test, so the rule is
// a pure function and every combination is checked here.
import { describe, expect, test } from "vitest";
import { enquiriesOpen } from "../src/lib/enquiries-open";

describe("AC3 -- every combination of takingEnquiries, site key and VERCEL_ENV", () => {
  const takingValues = [true, false] as const;
  const keyValues = ["site-key", "", undefined] as const;
  const envValues = ["production", "preview", "development", undefined] as const;

  for (const takingEnquiries of takingValues) {
    for (const siteKey of keyValues) {
      for (const vercelEnv of envValues) {
        const expected = takingEnquiries && !(vercelEnv === "production" && !siteKey);
        test(`taking=${String(takingEnquiries)} key=${JSON.stringify(siteKey)} env=${String(vercelEnv)} -> ${expected ? "form" : "strip"}`, () => {
          expect(enquiriesOpen({ takingEnquiries, siteKey, vercelEnv })).toBe(expected);
        });
      }
    }
  }

  test("an older backend that sends no takingEnquiries does not close the form by itself", () => {
    expect(enquiriesOpen({ takingEnquiries: undefined, siteKey: "site-key", vercelEnv: "production" })).toBe(true);
  });

  test("CI's production build with no site key and no VERCEL_ENV keeps the form", () => {
    expect(enquiriesOpen({ takingEnquiries: true, siteKey: undefined, vercelEnv: undefined })).toBe(true);
  });
});
