// Feature 1018, the frontend frame -- frontend e2e (frontend-conventions, Templates).
//
// AC7  Request a job, its confirmation, Respond, Approve, Forgot password, Set a new password
//      and a dead link each show the Focused frame: the one ink Top bar with only the
//      Wordmark, no other header, no footer, no sidebar
// AC8  each built page's content is no wider than its Page map Container (Narrow 420, Medium
//      720, Wide 1280), centred once the screen is wider; in the Portal shell it sits beside
//      the Sidebar
// AC9  every portal page shows one Page header: the Page title at 22px (20px on phone), weight
//      800; pages under a list show one Breadcrumb link and never a chain
// AC15 at 390px no shell scrolls sideways, and the menu icon and Log out are each 44px to tap
//
// A sample of each kind of page, not every page. Every page is read-only here: nothing is saved.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { makeCustomerLogin } from "./helpers/test-run";

const FOCUSED_PAGES = [
  { name: "Request a job", url: "/request-a-job", width: "medium" },
  { name: "Enquiry confirmation", url: "/request-a-job/confirmed?ref=JOB-1042", width: "narrow" },
  { name: "Forgot password", url: "/forgot-password", width: "narrow" },
  { name: "A dead reset link", url: "/reset-password?error=INVALID_TOKEN", width: "narrow" },
  { name: "Respond, dead link", url: "/a/not-a-real-token", width: "narrow" },
  { name: "Approve, dead link", url: "/approve/not-a-real-token", width: "narrow" },
] as const;

const MAX = { narrow: 420, medium: 720, wide: 1280 } as const;

async function noSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** The container's width, and how far it sits from each side of its Main slot. */
async function containerFit(page: Page) {
  return page.evaluate(() => {
    const container = document.querySelector("[data-container]") as HTMLElement;
    const main = container.closest("main") as HTMLElement;
    const c = container.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    return { kind: container.dataset["container"], width: c.width, left: c.left - m.left, right: m.right - c.right };
  });
}

test.describe("AC7 + AC8 -- the Focused shell", () => {
  for (const focused of FOCUSED_PAGES) {
    test(`${focused.name}: one ink Top bar with the Wordmark only, no footer, no sidebar; ${focused.width} container, centred at 1536px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1536, height: 900 });
      await page.goto(focused.url);
      await expect(page.locator("[data-container]")).toBeVisible();

      // The one Top bar: a single banner, ink, holding the Wordmark and nothing to click.
      const banners = page.getByRole("banner");
      await expect(banners).toHaveCount(1);
      await expect(banners.locator("span.uppercase")).toBeVisible();
      await expect(banners.getByRole("link")).toHaveCount(0);
      await expect(banners.getByRole("button")).toHaveCount(0);
      expect(await banners.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(28, 43, 58)");
      // No footer, no sidebar, no menu.
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(0);

      // The width: no wider than its Container, and centred.
      const fit = await containerFit(page);
      expect(fit.kind).toBe(focused.width);
      expect(fit.width).toBeLessThanOrEqual(MAX[focused.width]);
      expect(Math.abs(fit.left - fit.right)).toBeLessThanOrEqual(1);
    });
  }

  test("the Focused shell at 390px: no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const focused of FOCUSED_PAGES) {
      await page.goto(focused.url);
      await expect(page.locator("[data-container]")).toBeVisible();
      await noSidewaysScroll(page);
    }
  });
});

test.describe("AC8 + AC9 -- the Portal shell, ops", () => {
  test("Wide (the Job queue), Medium (Settings) sit beside the Sidebar, centred, at 1536px; the Page title is 22px, 800", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto("/ops/jobs");
    await login(page, "owner@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

    const wide = await containerFit(page);
    expect(wide.kind).toBe("wide");
    expect(wide.width).toBeLessThanOrEqual(MAX.wide);
    const sidebar = await page.getByRole("navigation", { name: "Sidebar" }).boundingBox();
    const container = await page.locator("[data-container]").boundingBox();
    expect(container!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
    expect(Math.abs(wide.left - wide.right)).toBeLessThanOrEqual(1);

    const title = page.getByRole("heading", { name: "Jobs", exact: true });
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe("22px");
    expect(await title.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("800");
    // One Page header: one h1.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    await page.goto("/ops/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    const medium = await containerFit(page);
    expect(medium.kind).toBe("medium");
    expect(medium.width).toBeLessThanOrEqual(MAX.medium);
    expect(Math.abs(medium.left - medium.right)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("Job detail and Contractor detail show one Breadcrumb link and never a chain", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ops/jobs/JOB-1042");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "JOB-1042", exact: true })).toBeVisible();
    const back = page.getByRole("link", { name: "< Jobs" });
    await expect(back).toHaveCount(1);
    await expect(back).toHaveAttribute("href", "/ops/jobs");
    await expect(page.getByText("Jobs / JOB-1042")).toHaveCount(0);

    await page.goto("/ops/contractors/CON-014");
    await expect(page.getByRole("link", { name: "< Contractors" })).toHaveAttribute("href", "/ops/contractors");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("CON-014");
    // Its Record tabs are unchanged.
    await expect(page.getByRole("tab", { name: "Details" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Service area" })).toBeVisible();
  });

  test("the Page title is 20px on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ops/jobs");
    await login(page, "mike@idelta.com.au");
    const title = page.getByRole("heading", { name: "Jobs", exact: true });
    await expect(title).toBeVisible();
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe("20px");
  });
});

test.describe("AC8 + AC9 -- the Portal shell, contractor and customer", () => {
  test("Bob's Dashboard is Wide, with the Page title at 22px, 800", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto("/contractor");
    await login(page, "bob@idelta.com.au");
    const title = page.getByRole("heading", { name: "Dashboard", exact: true });
    await expect(title).toBeVisible();
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe("22px");
    expect(await title.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("800");
    const fit = await containerFit(page);
    expect(fit.kind).toBe("wide");
    expect(fit.width).toBeLessThanOrEqual(MAX.wide);

    await page.goto("/contractor/rates");
    await expect(page.getByRole("heading", { name: "Rates", exact: true })).toBeVisible();
    expect((await containerFit(page)).kind).toBe("medium");
  });

  test("a customer's placeholder is in the Medium container, with its Page header", async ({ page }) => {
    const customer = await makeCustomerLogin();
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto("/account");
    await login(page, customer.email, customer.password);
    // The login card is titled the same; wait for the Portal frame, then read the page's title.
    await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
    const title = page.getByRole("heading", { name: "Customer account", exact: true });
    await expect(title).toBeVisible();
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe("22px");
    const fit = await containerFit(page);
    expect(fit.kind).toBe("medium");
    expect(fit.width).toBeLessThanOrEqual(MAX.medium);
  });

  test("a logged-out portal URL's login card is in the Narrow container, centred at 1536px", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto("/contractor");
    await expect(page.getByRole("heading", { name: "Contractor portal" })).toBeVisible();
    const fit = await containerFit(page);
    expect(fit.kind).toBe("narrow");
    expect(fit.width).toBeLessThanOrEqual(MAX.narrow);
    expect(Math.abs(fit.left - fit.right)).toBeLessThanOrEqual(1);
  });
});

test.describe("AC15 -- the Portal shell at 390px", () => {
  test.use(MOBILE_VIEWPORT);

  test("no sideways scroll on the gate, the ops page or the contractor page; the menu icon and Log out are 44px to tap", async ({
    page,
  }) => {
    await page.goto("/ops");
    await noSidewaysScroll(page);

    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
    await noSidewaysScroll(page);

    const icon = await page.getByRole("button", { name: "Open menu" }).boundingBox();
    expect(icon!.width).toBeGreaterThanOrEqual(44);
    expect(icon!.height).toBeGreaterThanOrEqual(44);

    await page.getByRole("button", { name: "Open menu" }).click();
    const logOut = await page.locator("[data-menu-drawer]").getByRole("button", { name: "Log out" }).boundingBox();
    expect(logOut!.height).toBeGreaterThanOrEqual(44);
    expect(logOut!.width).toBeGreaterThanOrEqual(44);
    await noSidewaysScroll(page);
    await page.locator("[data-menu-drawer]").getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    await page.goto("/contractor");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await noSidewaysScroll(page);
  });
});
