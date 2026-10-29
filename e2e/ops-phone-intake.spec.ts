// Feature 3005 -- phone-taken job intake, frontend e2e (ADR 0001).
//
// AC1  the Jobs page has "New phone job"; it opens the Phone intake page for Mike; a contractor sees
//      the wrong-portal card and the endpoint refuses him (the endpoint's other refusals are proven at
//      the backend, tests/phone-intake.test.ts)
// AC2  Mike keys a job, Create job opens the new job's page, and the queue row says Phone
// AC6  pressing Create job on an empty page shows each required field's own error and creates nothing
// UAT  the street address and site contact boxes are there and optional; a half-filled contact is refused on its own box
// AC7  with Google Places down the suburb box offers "Platform suggestions" and the job saves
// AC8  the page shows no photos, marketing ticks or reCAPTCHA
//
// Every job this file keys is a genuine Customer + Job row for a throwaway e2e-3005-... email,
// labelled e2e by the test-run cookie and swept with the rest. The customer's Enquiry received email
// goes through the test-run path, never a cast mailbox.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOCKS_GOOGLE_PLACES, blockGooglePlaces, installMockGooglePlaces } from "./helpers/mock-google-places";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

function uniqueEmail(tag: string): string {
  return `e2e-3005-${tag}-${String(Date.now())}@idelta.com.au`;
}

async function fillCustomerAndJob(page: Page, tag: string): Promise<{ email: string; name: string }> {
  const name = `E2E Phone ${tag} ${String(Date.now())}`;
  const email = uniqueEmail(tag);
  await page.getByLabel("Trade").selectOption("Plumbing");
  await page.getByLabel("What's happening").fill("Burst pipe under the house.");
  await page.getByLabel("Morning").check();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone", { exact: true }).fill("0400 000 305");
  return { email, name };
}

test("AC1, AC2: Mike presses New phone job, keys a job, lands on its page, and the queue says Phone", async ({ page }) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await page.getByRole("link", { name: "New phone job" }).click();
  await expect(page).toHaveURL(/\/ops\/jobs\/new$/);
  await expect(page.getByRole("heading", { name: "New phone job", level: 1 })).toBeVisible();
  await expect(page.getByText("Key the job while the customer is on the line.")).toBeVisible();
  await expect(page.locator('[data-container="medium"]')).toBeVisible();

  const suburb = page.getByLabel("Suburb");
  await expect(suburb).toBeEnabled({ timeout: 10_000 });
  await suburb.fill("Fremantle");
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Fremantle/ }).first().click();
  await expect(suburb).toHaveValue(/Fremantle WA/, { timeout: 20_000 });
  const { name } = await fillCustomerAndJob(page, "ac2");
  // The two prices for the trade and date, to read out.
  await expect(page.getByTestId("price-box")).toBeVisible();

  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page).toHaveURL(/\/ops\/jobs\/JOB-\d+$/, { timeout: 20_000 });
  const reference = /\/ops\/jobs\/(JOB-\d+)$/.exec(page.url())?.[1] ?? "";
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();

  await page.goto("/ops/jobs");
  await page.getByLabel("Search jobs").fill(name);
  const row = page.getByRole("row").filter({ hasText: reference });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText("Phone", { exact: true })).toBeVisible();
});

test("AC6: an empty page shows each required field's own error and creates nothing", async ({ page }) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  let posted = 0;
  await page.route(/\/api\/jobs\/phone/, (route) => {
    posted += 1;
    return route.continue();
  });
  await page.goto("/ops/jobs/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "New phone job", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Create job" }).click();
  for (const message of [
    "Pick a suburb from the list.",
    "Pick a trade.",
    "Tell us what's happening.",
    "Pick a time of day.",
    "Enter the customer's name.",
    "Enter the customer's email address.",
    "Enter the customer's phone number.",
  ]) {
    await expect(page.getByText(message)).toBeVisible();
  }
  expect(posted).toBe(0);
});

test("UAT: the street address and site contact are optional boxes; a contact with a name and no phone is refused on its own box", async ({ page }) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  let posted = 0;
  await page.route(/\/api\/jobs\/phone/, (route) => {
    posted += 1;
    return route.continue();
  });
  await page.goto("/ops/jobs/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByLabel("Street address of the job")).toBeVisible();
  await page.getByLabel("Site contact name").fill("Lena Park");
  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page.getByText("Required.")).toBeVisible();
  expect(posted).toBe(0);
});

test("AC7: with Google Places down the suburb box offers Platform suggestions and the job saves", async ({ page }) => {
  await blockGooglePlaces(page);
  await page.goto("/ops/jobs/new");
  await login(page, "mike@idelta.com.au");
  const suburb = page.getByLabel("Suburb");
  await expect(suburb).toBeEnabled({ timeout: 10_000 });
  await suburb.fill("Hilt");
  await expect(page.getByText("Platform suggestions")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Hilton WA 6163" }).click();
  await expect(suburb).toHaveValue("Hilton WA 6163");
  await fillCustomerAndJob(page, "ac7");
  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page).toHaveURL(/\/ops\/jobs\/JOB-\d+$/, { timeout: 20_000 });
});

test("AC8: no photos, marketing ticks or reCAPTCHA on the page", async ({ page }) => {
  await page.goto("/ops/jobs/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "New phone job", level: 1 })).toBeVisible();
  await expect(page.getByText("Photos", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/offers and updates/)).toHaveCount(0);
  await expect(page.locator("input[type=checkbox]")).toHaveCount(0);
  await expect(page.locator("script[src*='recaptcha']")).toHaveCount(0);
});

test("AC1: a contractor cannot open the page, and the endpoint refuses him", async ({ page }) => {
  await page.goto("/ops/jobs/new");
  await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New phone job" })).toHaveCount(0);

  const logged = await page.context().request.post(`${apiUrl}/api/jobs/phone`, { data: {} });
  expect(logged.status()).toBe(401);

  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  // From the page itself, the way the app calls the API (the session cookie rides along). Polled:
  // right after the login the first call can still read as logged out.
  await expect
    .poll(
      () =>
        page.evaluate(
          async (url) => (await fetch(`${url}/api/jobs/phone`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })).status,
          apiUrl,
        ),
      { timeout: 15_000, intervals: [500] },
    )
    .toBe(403);
  await page.goto("/ops/jobs/new");
  await expect(page.getByRole("heading", { name: "New phone job" })).toHaveCount(0);
});
