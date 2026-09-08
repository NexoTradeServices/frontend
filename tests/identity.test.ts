// Feature 1014, brand strings go to config -- AC7 (unit, Vitest).
//
// AC7  with the identity endpoint unreachable, the login gate still renders
//      its card and the wordmark slot is empty -- no literal, no crash
//
// Moved out of frontend/e2e/brand-identity.spec.ts by
// project/setup/frontend-test-harness.md Part 1: this opens no page.
// getDisplayName() (src/lib/identity.ts) reads happen inside the Next.js
// server process during SSR; Playwright's page.route only intercepts
// requests the BROWSER makes, so it cannot fail that fetch (tried directly
// and empirically confirmed to have no effect -- the real value still
// rendered regardless of the route.abort()). These two call the actual
// functions directly, in Node, stubbing global fetch, rather than resting
// on inspection through a browser alone -- which is also why they never
// needed Playwright's three viewport projects tripling them for nothing.
import { describe, expect, test } from "vitest";

describe("AC7 -- degrades gracefully when the identity read fails", () => {
  test("getDisplayName() returns null when the fetch throws", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network unreachable");
    }) as typeof fetch;
    try {
      const { getDisplayName } = await import("../src/lib/identity");
      await expect(getDisplayName()).resolves.toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });

  test("getDisplayName() returns null on a non-200 response, and Wordmark renders nothing for it", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve(new Response(null, { status: 503 }))) as typeof fetch;
    let name: string | null;
    try {
      const { getDisplayName } = await import("../src/lib/identity");
      name = await getDisplayName();
    } finally {
      globalThis.fetch = original;
    }
    expect(name).toBeNull();

    const { Wordmark } = await import("../src/components/brand/wordmark");
    expect(Wordmark({ name })).toBeNull();
  });
});
