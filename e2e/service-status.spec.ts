// Feature 6012, service status page -- frontend e2e (ADR 0001).
//
// AC1  Mike opens Service status from the ops menu and sees six rows in order -- Mailjet,
//      ClickSend, Stripe, Google Places, reCAPTCHA, Cloudinary -- each Checking, then its answer
// AC3  Up, Down with its reason, and Not set up read as the right Tags
// AC5  Google Places is checked from the browser: Up when it answers, Down when it cannot be loaded
// AC6  "Check again" runs every check again and is disabled while they run
// AC7  a contractor login cannot open the page (the backend half is tests/status.test.ts)
//
// GET /api/status is answered through Playwright routing, so no outside service is called and the
// state each row shows is the one the test chose. Places is made to answer (a pre-seeded fake
// library) or to fail (the script blocked) -- never the real Google.
import { test, expect, type Page } from "@playwright/test";
import { blockGooglePlaces, installMockGooglePlaces } from "./helpers/mock-google-places";
import { login } from "./helpers/login";

interface Row {
  key: string;
  name: string;
  state: "up" | "down" | "not_set_up";
  reason?: string;
}

const ANSWER: Row[] = [
  { key: "mailjet", name: "Mailjet", state: "up" },
  { key: "clicksend", name: "ClickSend", state: "not_set_up" },
  { key: "stripe", name: "Stripe", state: "down", reason: "The key was refused" },
  { key: "recaptcha", name: "reCAPTCHA", state: "down", reason: "No answer within 5 seconds" },
  { key: "cloudinary", name: "Cloudinary", state: "up" },
];

/** Answers GET /api/status after `delayMs`, and counts the calls. */
async function answerStatus(page: Page, services: Row[], delayMs = 0): Promise<{ calls: number }> {
  const seen = { calls: 0 };
  await page.route(/\/api\/status$/, async (route) => {
    seen.calls += 1;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ services }) });
  });
  return seen;
}

const row = (page: Page, key: string) => page.locator(`tr[data-service="${key}"], div[data-service="${key}"]`).first();

async function openAsMike(page: Page) {
  await page.goto("/ops/status");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Service status" })).toBeVisible();
}

test.describe("Feature 6012 -- service status", () => {
  test("AC1: from the ops menu, six rows in order, Checking first, then each answer", async ({ page }) => {
    await installMockGooglePlaces(page);
    await answerStatus(page, ANSWER, 800);
    await page.goto("/ops");
    await login(page, "mike@idelta.com.au");
    await page.getByRole("link", { name: "Service status" }).first().click();
    await expect(page).toHaveURL(/\/ops\/status$/);
    await expect(page.getByText("Each service is checked live when this page opens. Nothing is recorded.")).toBeVisible();

    // The names, in the design's order (the table is the Tablet-and-up view; Phone shows the same rows as cards).
    const names = page.locator("table tbody tr td:first-child span.text-ink");
    if (await names.first().isVisible()) {
      await expect(names).toHaveText(["Mailjet", "ClickSend", "Stripe", "Google Places", "reCAPTCHA", "Cloudinary"]);
    }
    await expect(page.getByText("Checking").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Check again" }).first()).toBeDisabled();
    await expect(page.getByText("Checking")).toHaveCount(0, { timeout: 10_000 });
  });

  test("AC3: Up, Down with its reason, and Not set up read as their Tags", async ({ page }) => {
    await installMockGooglePlaces(page);
    await answerStatus(page, ANSWER);
    await openAsMike(page);

    await expect(row(page, "mailjet").getByText("Up", { exact: true })).toBeVisible();
    await expect(row(page, "clicksend").getByText("Not set up", { exact: true })).toBeVisible();
    await expect(row(page, "stripe").getByText("Down", { exact: true })).toBeVisible();
    await expect(row(page, "stripe").getByText("The key was refused")).toBeVisible();
    await expect(row(page, "recaptcha").getByText("No answer within 5 seconds")).toBeVisible();
    await expect(row(page, "cloudinary").getByText("Up", { exact: true })).toBeVisible();
  });

  test("AC5: Places answers -> Up", async ({ page }) => {
    await installMockGooglePlaces(page);
    await answerStatus(page, ANSWER);
    await openAsMike(page);
    await expect(row(page, "places").getByText("Up", { exact: true })).toBeVisible();
  });

  test("AC5: Places cannot be loaded -> Down", async ({ page }) => {
    await blockGooglePlaces(page);
    await answerStatus(page, ANSWER);
    await openAsMike(page);
    await expect(row(page, "places").getByText("Down", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row(page, "mailjet").getByText("Up", { exact: true })).toBeVisible();
  });

  test("AC5/AC6: Places Down because the script failed, then Check again once Google is back -> Up", async ({ page }) => {
    await answerStatus(page, ANSWER);
    await blockGooglePlaces(page);
    await openAsMike(page);
    await expect(row(page, "places").getByText("Down", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Google comes back: the next request for the script is answered with a working library.
    await page.unroute(/maps\.googleapis\.com/);
    await page.route(/maps\.googleapis\.com/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: `window.google = { maps: { places: { AutocompleteSuggestion: { fetchAutocompleteSuggestions: () => Promise.resolve({ suggestions: [] }) } } } };
               const ready = window.__tradeserviceGooglePlacesReady; if (ready) ready();`,
      }),
    );
    await page.getByRole("button", { name: "Check again" }).first().click();
    await expect(row(page, "places").getByText("Up", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("the platform's own server not answering -> the five backend rows read Down with the words", async ({ page }) => {
    await installMockGooglePlaces(page);
    await page.route(/\/api\/status$/, (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await openAsMike(page);
    for (const key of ["mailjet", "clicksend", "stripe", "recaptcha", "cloudinary"]) {
      await expect(row(page, key).getByText("Could not reach the platform's own server")).toBeVisible();
    }
    await expect(row(page, "places").getByText("Up", { exact: true })).toBeVisible();
  });

  test("AC6: Check again runs all the checks again, and is disabled while they run", async ({ page }) => {
    await installMockGooglePlaces(page);
    const seen = await answerStatus(page, ANSWER, 700);
    await openAsMike(page);
    const again = page.getByRole("button", { name: "Check again" }).first();
    await expect(again).toBeEnabled({ timeout: 10_000 });
    // The dev server's Strict Mode runs the first check twice; a production build runs it once.
    const before = seen.calls;
    expect(before).toBeGreaterThanOrEqual(1);

    await again.click();
    await expect(again).toBeDisabled();
    await expect(page.getByText("Checking").first()).toBeVisible();
    await expect(again).toBeEnabled({ timeout: 10_000 });
    expect(seen.calls).toBe(before + 1);
    await expect(row(page, "mailjet").getByText("Up", { exact: true })).toBeVisible();
  });

  test("AC7: a contractor login cannot open the page", async ({ page }) => {
    await page.goto("/ops/status");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service status" })).toHaveCount(0);
  });
});
