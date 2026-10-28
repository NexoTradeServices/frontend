// Feature 3004 -- guest to account upgrade, frontend e2e (ADR 0001).
//
// AC2  a guest asks for a link on /set-password: the card turns into "Check your inbox" with the
//      same words whatever the address
// AC3  the emailed link opens Set a new password; choosing a password logs her in and lands on /account
// AC6  a confirmed bot is refused with the call-us Banner (the backend's refusal is answered here
//      through Playwright routing - a real bot score cannot be produced on demand)
// AC11 the eye on Set a new password: tapping it shows the typed password, tapping again hides it
// plus: an empty or malformed email shows the Field's own error "Enter your email address."
//
// The email, the 60-second hold, the fresh link and the unknown address are proven at the backend
// (tests/set-password-request.test.ts). The link itself is read through the backend's test hook.
import { test, expect, type APIRequestContext } from "@playwright/test";
import { askForSetPasswordLink } from "./helpers/set-password";
import { waitForHydration } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** A throwaway guest customer, made the way the public form makes one (labelled e2e by the test-run cookie). */
async function makeGuest(request: APIRequestContext, tag: string): Promise<string> {
  const email = `e2e-3004-${tag}-${String(Date.now())}@idelta.com.au`;
  const res = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name: "E2E Guest",
      email,
      phone: "0400 000 304",
      location: { suburb: "Fremantle", state: "WA", country: "AU", postcode: "6160", lat: -32.0569, lng: 115.7439, placeId: `e2e-3004-${tag}` },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: "2027-03-01",
      preferredWindow: "morning",
      description: "An e2e throwaway job for feature 3004.",
      marketingEmail: false,
      marketingSms: false,
    },
  });
  expect(res.status()).toBe(201);
  return email;
}

test("AC2: a guest asks for a link and the card reads Check your inbox", async ({ page, request }) => {
  const email = await makeGuest(request, "ask");
  await page.goto("/set-password");
  await expect(page.getByRole("heading", { name: "Track your jobs online" })).toBeVisible();
  await expect(page.locator('[data-container="narrow"]')).toBeVisible();
  await waitForHydration(page, "email");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("If we have jobs under that address, we've sent you a link to set your password.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the home page" })).toBeVisible();
});

test("AC2: an address we do not hold gets exactly the same card", async ({ page }) => {
  await page.goto("/set-password");
  await waitForHydration(page, "email");
  await page.getByLabel("Email").fill(`e2e-3004-nobody-${String(Date.now())}@idelta.com.au`);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });
});

test("an empty or malformed email shows the Field's own error and sends nothing", async ({ page }) => {
  let sent = 0;
  await page.route(/\/api\/account\/set-password-request/, (route) => {
    sent += 1;
    return route.continue();
  });
  await page.goto("/set-password");
  await waitForHydration(page, "email");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  expect(sent).toBe(0);
});

test("AC6: a confirmed bot is refused with the call-us Banner", async ({ page }) => {
  await page.route(/\/api\/account\/set-password-request/, (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "bot", operatorPhone: "08 0000 0000" }) }),
  );
  await page.goto("/set-password");
  await waitForHydration(page, "email");
  await page.getByLabel("Email").fill("someone@idelta.com.au");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(/We couldn't take that request automatically - please call us on/)).toBeVisible();
  await expect(page.getByRole("link", { name: "08 0000 0000" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toHaveCount(0);
});

test("AC3, AC11: the link opens Set a new password; the eye shows and hides it; saving logs her in at /account", async ({ page, request }) => {
  const email = await makeGuest(request, "link");
  const path = await askForSetPasswordLink(request, email);

  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible({ timeout: 15_000 });
  await waitForHydration(page, "new-password");
  const box = page.getByLabel("New password", { exact: true });
  await box.fill("a-new-guest-password-1");
  await expect(box).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(box).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(box).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Set password", exact: true }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
});
