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
import { describe, expect, test, vi } from "vitest";

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

// Feature 1018: the identity read also carries the support phone the Footer shows.
describe("1018 -- the identity read carries the phone", () => {
  test("getIdentity() returns the name and the phone", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ displayName: "Perth Trades & Services", operatorPhone: "08 0000 0000" }), {
          status: 200,
        }),
      )) as typeof fetch;
    try {
      const { getIdentity } = await import("../src/lib/identity");
      await expect(getIdentity()).resolves.toEqual({
        displayName: "Perth Trades & Services",
        operatorPhone: "08 0000 0000",
        approvedPublicDomain: null, // 8002: an answer without the field reads as blank
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  test("getIdentity() returns null when the read fails, so the Footer leaves name and phone out", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve(new Response(null, { status: 503 }))) as typeof fetch;
    try {
      const { getIdentity } = await import("../src/lib/identity");
      await expect(getIdentity()).resolves.toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});

// Feature 8002, the Google-visibility fail-safe: blank, a mismatch, or a failed
// read all mean "hidden"; only an exact host match opens a page to search.
describe("8002 -- isIndexableHost and the root layout's robots", () => {
  const identity = (approvedPublicDomain: string | null) => ({
    displayName: "Perth Trades & Services",
    operatorPhone: null,
    approvedPublicDomain,
  });

  test("getIdentity() reads approvedPublicDomain; anything that is not a non-empty string is null", async () => {
    const original = globalThis.fetch;
    const answer = (body: unknown) =>
      (() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))) as typeof fetch;
    try {
      const { getIdentity } = await import("../src/lib/identity");
      globalThis.fetch = answer({ displayName: "X", approvedPublicDomain: "example.com.au" });
      expect((await getIdentity())?.approvedPublicDomain).toBe("example.com.au");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("isIndexableHost: only an exact match opens; blank, mismatch, www, null identity stay hidden", async () => {
    const { isIndexableHost } = await import("../src/lib/identity");
    expect(isIndexableHost("example.com.au", identity("example.com.au"))).toBe(true);
    expect(isIndexableHost("EXAMPLE.com.au:3000", identity("example.com.au"))).toBe(true);
    expect(isIndexableHost("example.com.au", identity(null))).toBe(false);
    expect(isIndexableHost("test.example.com.au", identity("example.com.au"))).toBe(false);
    expect(isIndexableHost("www.example.com.au", identity("example.com.au"))).toBe(false);
    expect(isIndexableHost("example.com.au", null)).toBe(false);
    expect(isIndexableHost(null, identity("example.com.au"))).toBe(false);
    expect(isIndexableHost("", identity("example.com.au"))).toBe(false);
  });

  async function metadataFor(host: string, fetchImpl: typeof fetch) {
    vi.resetModules();
    vi.doMock("next/headers", () => ({ headers: () => Promise.resolve(new Headers({ host })) }));
    // The layout's font loader only runs inside the Next build.
    vi.doMock("next/font/local", () => ({ default: () => ({ variable: "" }) }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const { generateMetadata } = await import("../src/app/layout");
      return await generateMetadata();
    } finally {
      globalThis.fetch = original;
      vi.doUnmock("next/headers");
      vi.doUnmock("next/font/local");
    }
  }

  const ok = (domain: string | null) =>
    (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ displayName: "Perth Trades & Services", operatorPhone: "08 0000 0000", approvedPublicDomain: domain }),
          { status: 200 },
        ),
      )) as typeof fetch;

  test("AC7: when the identity read fails the layout still answers, with noindex, nofollow", async () => {
    const threw = (() => {
      throw new Error("network unreachable");
    }) as typeof fetch;
    const failing = (() => Promise.resolve(new Response(null, { status: 503 }))) as typeof fetch;
    for (const impl of [threw, failing]) {
      const meta = await metadataFor("example.com.au", impl);
      expect(meta.robots).toEqual({ index: false, follow: false });
    }
  });

  test("AC4/AC5/AC6: blank and mismatch say noindex; the exact host carries no robots key", async () => {
    expect((await metadataFor("example.com.au", ok(null))).robots).toEqual({ index: false, follow: false });
    expect((await metadataFor("other.com.au", ok("example.com.au"))).robots).toEqual({ index: false, follow: false });
    expect((await metadataFor("example.com.au", ok("example.com.au"))).robots).toBeUndefined();
  });
});
