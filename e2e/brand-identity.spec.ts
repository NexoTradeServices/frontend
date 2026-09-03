// Feature 1014, brand strings go to config -- frontend e2e (ADR 0001, Playwright).
//
// AC6  after a rename, the login gate (logged out), the ops shell (logged
//      in) and the browser-tab title all show the stand-in; the ampersand
//      in the seeded name renders in the accent colour before the change
// AC7  with the identity endpoint unreachable, the login gate still renders
//      its card and the wordmark slot is empty -- no literal, no crash
// AC8  the interim wording, and the literal "Perth Trades & Services", never
//      appear anywhere in frontend/src
//
// AC6 writes the shared PlatformSettings row -- same "desktop project only,
// leave it as we found it" discipline as settings.spec.ts.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

const DEV_PASSWORD = "dev-password-123";
const INTERIM_WORDING = "Perth Trades & Services";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function logout(page: import("@playwright/test").Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
}

test(
  "AC6 (desktop only): a rename on the settings screen follows through to the ops shell, the login gate and the tab title",
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "writes the shared PlatformSettings row; runs on one project only to avoid racing the others",
    );

    // Before the change -- the seeded name, ampersand in the accent colour,
    // on both the ops shell (logged in) and the login gate (logged out).
    await page.goto("/ops/settings");
    await login(page, "owner@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Business name")).toHaveValue(INTERIM_WORDING);
    const sidebarWordmarkBefore = page.locator("nav[aria-label='Sidebar']").getByText("Perth Trades");
    await expect(sidebarWordmarkBefore).toBeVisible();
    await expect(page.locator("nav[aria-label='Sidebar'] span.text-brand-accent")).toHaveText("&");
    await expect(page).toHaveTitle(INTERIM_WORDING);

    // The rename.
    await page.getByLabel("Business name").fill("Stand-In Trades");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // A reload re-fetches the identity endpoint server-side -- the sidebar
    // wordmark and the tab title both follow, with no ampersand this time.
    await page.reload();
    await expect(page.locator("nav[aria-label='Sidebar']")).toContainText("Stand-In Trades");
    await expect(page).toHaveTitle("Stand-In Trades");

    // Logged out, the gate shows the same rename.
    await logout(page);
    await page.goto("/ops");
    await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
    await expect(page.locator(".bg-ink").getByText("Stand-In Trades")).toBeVisible();

    // Leave the row exactly as found.
    await page.goto("/ops/settings");
    await login(page, "owner@idelta.com.au");
    await expect(page.getByLabel("Business name")).toHaveValue("Stand-In Trades");
    await page.getByLabel("Business name").fill(INTERIM_WORDING);
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await logout(page);
  },
);

// AC7 has no page.goto()-driven e2e test -- see change.md, Decisions made
// mid-build, item 2. getDisplayName() (src/lib/identity.ts) reads happen
// inside the Next.js server process during SSR; Playwright's page.route
// only intercepts requests the BROWSER makes, so it cannot fail that fetch
// (tried directly and empirically confirmed to have no effect -- the real
// value still rendered regardless of the route.abort()).
//
// A Playwright test FUNCTION, though, runs in Node -- the same runtime
// getDisplayName() runs in during SSR -- so these two exercise the actual
// functions directly, stubbing global fetch, rather than resting on
// inspection alone.
test.describe("AC7 -- degrades gracefully when the identity read fails", () => {
  test("AC7: getDisplayName() returns null when the fetch throws", async () => {
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

  test("AC7: getDisplayName() returns null on a non-200 response, and Wordmark renders nothing for it", async () => {
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

test("AC8: the interim wording appears nowhere in frontend/src", async () => {
  // Playwright config resolves testDir relative to the frontend project
  // root, and tests run with that as cwd.
  const srcDir = path.join(process.cwd(), "src");

  async function filesUnder(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await filesUnder(full)));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  const files = await filesUnder(srcDir);
  const hits: string[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (content.includes(INTERIM_WORDING)) hits.push(path.relative(srcDir, file));
  }
  expect(hits).toEqual([]);
});
