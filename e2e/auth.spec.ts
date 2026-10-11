// Feature 1003, auth + roles -- frontend e2e (ADR 0001, Playwright).
//
// AC1  Mike logs in at /ops and lands in the ops portal (the placeholder
//      it first landed on is gone: since feature 4001, /ops sends an ops
//      session to the job queue)
// AC3  Bob, logged in as a contractor, opening /ops sees the wrong-door card
// AC11 "Go to your portal" lands each role on its own root
// 1018 AC4 logged out, /ops, /ops/settings, /contractor/payouts and /account each show the
//      Focused frame with the login card named for the portal at that same URL; logging
//      in as the right role shows that same URL's page in the Portal frame
// 1018 AC5 Bob at /ops sees the wrong-portal card in the Focused frame
// 1018 AC6 Mike at /ops/settings or /ops/pricing stays in the Portal frame and sees the
//      Owner only card with "Go to Jobs"
// AC12 the gate holds the responsive floor at 390px -- its own describe
//      block below opts into MOBILE_VIEWPORT (project/setup/
//      frontend-test-harness.md Part 1); every other test in this file is
//      plain login behaviour and runs once, at the default desktop viewport.
//
// Runs against the seeded dev database (`npm run db:seed:fixtures`), not a
// throwaway one -- so this file never completes a password reset (that would
// permanently change Bob's dev password) and never asserts on state a
// parallel test run could have changed; it only exercises login, wrong-door,
// and log out, all reversible.
import { test, expect } from "@playwright/test";
import { login, waitForHydration } from "./helpers/login";
import { makeCustomerLogin } from "./helpers/test-run";
import { MOBILE_VIEWPORT } from "../playwright.config";

test("AC1: Mike logs in at /ops and lands in the ops portal", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
  // 9001 AC4: the login title is the Page title token -- heading font, 800, 22px from Tablet up.
  await expect(page.getByRole("heading", { name: "Operations portal" })).toHaveCSS("font-size", "22px");
  await expect(page.getByRole("heading", { name: "Operations portal" })).toHaveCSS("font-weight", "800");

  await login(page, "mike@idelta.com.au");

  // Feature 4001, plan decision 11: the queue is ops' dashboard.
  await expect(page).toHaveURL(/\/ops\/jobs$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
  await expect(page.getByTestId("menu-person")).toHaveText("Mike");
  // The menu's Jobs entry is shown and marked current (desktop sidebar).
  const jobsEntry = page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: "Jobs", exact: true });
  await expect(jobsEntry).toHaveAttribute("aria-current", "page");

  // Below the shell's lg breakpoint (1024px since feature 4001, BKLG-024),
  // log out lives behind the menu button -- open it first where it exists.
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
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
  await expect(page.getByText("bob@idelta.com.au")).toBeVisible();
  // 9001 AC4/AC5: the one Message card in the Narrow container, its title 22px and 800, one Primary, one Link.
  await expect(page.locator('[data-container="narrow"]').getByTestId("message-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toHaveCSS("font-size", "22px");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toHaveCSS("font-weight", "800");
  await expect(page.getByTestId("message-card").getByRole("link")).toHaveCount(1);
  await expect(page.getByTestId("message-card").getByRole("button", { name: "Log out" })).toBeVisible();
  // 1018 AC5: the Focused frame - the Wordmark-only Top bar, no sidebar, no menu.
  await expect(page).toHaveURL(/\/ops$/);
  await expect(page.getByRole("banner").getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Go to your portal" })).toHaveAttribute("href", "/contractor");

  await page.getByRole("link", { name: "Go to your portal" }).click();
  await expect(page).toHaveURL(/\/contractor$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Contractor portal" })).toBeVisible();
});

const GATES = [
  { url: "/ops", card: "Operations portal", role: "mike@idelta.com.au", landing: "Jobs" },
  { url: "/ops/settings", card: "Operations portal", role: "owner@idelta.com.au", landing: "Settings" },
  { url: "/contractor/payouts", card: "Contractor portal", role: "bob@idelta.com.au", landing: "Payouts" },
];

for (const gate of GATES) {
  test(`1018 AC4: logged out, ${gate.url} shows the Focused frame with the ${gate.card} login card at that same URL; the right login lands on the page in the Portal frame`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const response = await page.goto(gate.url);
    // No redirect, no login URL.
    expect(response?.url()).toMatch(new RegExp(`${gate.url}$`));
    await expect(page).toHaveURL(new RegExp(`${gate.url}$`));
    await expect(page.getByRole("heading", { name: gate.card })).toBeVisible();
    // The Focused frame: one ink Top bar with the Wordmark only, no sidebar.
    await expect(page.getByRole("banner").getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);

    await login(page, gate.role);
    // /ops is the one root that forwards to the queue (4001); every other URL stays put.
    if (gate.url === "/ops") await expect(page).toHaveURL(/\/ops\/jobs$/, { timeout: 15_000 });
    else await expect(page).toHaveURL(new RegExp(`${gate.url}$`));
    await expect(page.getByRole("heading", { name: gate.landing, exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
    await page.getByRole("navigation", { name: "Sidebar" }).getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });
}

test("1018 AC4: logged out, /account shows the Customer account login card at that same URL; a customer lands on the same URL in the Portal frame", async ({
  page,
}) => {
  const customer = await makeCustomerLogin();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Customer account" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);

  await login(page, customer.email, customer.password);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
  await page.getByRole("navigation", { name: "Sidebar" }).getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("1018 AC6: Mike at /ops/settings and /ops/pricing stays in the Portal frame and sees the Owner only card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ops/settings");
  await login(page, "mike@idelta.com.au");
  // The same URL, now Mike's page in the Portal frame. Wait for it: the sign-in is still
  // in flight when the Log in button gives way to "Logging in...".
  await expect(page.getByRole("heading", { name: "Owner only" })).toBeVisible();

  for (const url of ["/ops/settings", "/ops/pricing"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Owner only" })).toBeVisible();
    await expect(page.getByText("You're logged in as Mike. This page is for the owner's login.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Jobs" })).toHaveAttribute("href", "/ops/jobs");
    // Still in the Portal frame: the Sidebar is there, with his name.
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
    await expect(page.getByTestId("menu-person")).toHaveText("Mike");
  }

  await page.getByRole("link", { name: "Go to Jobs" }).click();
  await expect(page).toHaveURL(/\/ops\/jobs$/);
  await page.getByRole("navigation", { name: "Sidebar" }).getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("AC2: a wrong password shows the generic banner, never a field-specific one", async ({
  page,
}) => {
  await page.goto("/ops");
  await waitForHydration(page, "email");
  await page.getByLabel("Email").fill("mike@idelta.com.au");
  await page.getByLabel("Password").fill("not-the-right-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(/don't match/)).toBeVisible();
});

test("the forgot-password form reaches the no-enumeration sent state", async ({ page }) => {
  await page.goto("/ops");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toHaveCSS("font-size", "22px");

  await waitForHydration(page, "email");
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
  // 9001 AC4/AC5: the one Message card in the Narrow container, its title 22px and 800.
  await expect(page.locator('[data-container="narrow"]').getByTestId("message-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "This link has expired" })).toHaveCSS("font-size", "22px");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toHaveCSS("font-weight", "800");
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

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
});
