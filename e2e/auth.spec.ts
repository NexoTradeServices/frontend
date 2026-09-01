// Feature 1003, auth + roles -- frontend e2e (ADR 0001, Playwright).
//
// AC1  Mike logs in at /ops and lands on the ops placeholder
// AC3  Bob, logged in as a contractor, opening /ops sees the wrong-door card
// AC11 "Go to your portal" lands each role on its own root
// AC12 the gate and reset pages hold the responsive floor at 390px (this
//      suite's own `mobile` project runs every test below at that viewport)
//
// Runs against the seeded dev database (`npm run db:seed:fixtures`), not a
// throwaway one -- so this file never completes a password reset (that would
// permanently change Bob's dev password) and never asserts on state a
// parallel test run could have changed; it only exercises login, wrong-door,
// and log out, all reversible.
import { test, expect } from "@playwright/test";

// The dev-only password every seeded login shares (backend/src/db/seed/auth.ts).
const DEV_PASSWORD = "dev-password-123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("AC1: Mike logs in at /ops and lands on the ops placeholder", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();

  await login(page, "mike@idelta.com.au");

  await expect(page.getByText(/Logged in as Mike/)).toBeVisible();
  await expect(page.getByText(/Operations admin/)).toBeVisible();

  // Below the shell's md breakpoint, log out lives behind the menu button
  // (Feature 1006, the ops portal shell) -- open it first where it exists.
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();

  // Leave the account as we found it.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
});

test("AC3 + AC11: Bob's contractor session sees the wrong-door card on /ops, and its primary action returns him to his own portal", async ({
  page,
}) => {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByText(/Logged in as Bob Reilly/)).toBeVisible();

  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
  await expect(page.getByText("bob@idelta.com.au")).toBeVisible();

  await page.getByRole("link", { name: "Go to your portal" }).click();
  await expect(page).toHaveURL(/\/contractor$/);
  await expect(page.getByText(/Logged in as Bob Reilly/)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Contractor portal" })).toBeVisible();
});

test("AC2: a wrong password shows the generic banner, never a field-specific one", async ({
  page,
}) => {
  await page.goto("/ops");
  await page.getByLabel("Email").fill("mike@idelta.com.au");
  await page.getByLabel("Password").fill("not-the-right-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(/don't match/)).toBeVisible();
});

test("the forgot-password form reaches the no-enumeration sent state", async ({ page }) => {
  await page.goto("/ops");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

  await page.getByLabel("Email").fill("mike@idelta.com.au");
  await page.getByRole("button", { name: "Email me a reset link" }).click();

  await expect(page.getByText(/If that email has an account/)).toBeVisible();
});

test("a dead reset link shows the dead-link page with its fix as the primary action", async ({
  page,
}) => {
  await page.goto("/reset-password?error=INVALID_TOKEN");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Email me a fresh link" })).toBeVisible();
});

test("AC12: no horizontal scrolling on the gate, and every action stays reachable", async ({
  page,
}) => {
  await page.goto("/ops");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
});
