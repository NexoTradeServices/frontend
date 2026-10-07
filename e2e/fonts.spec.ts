// Feature 9004, fonts bundled -- frontend e2e (ADR 0001, Playwright).
//
// AC3  every page's headings render in Archivo (800; 900 for the wordmark)
//      and body text in Public Sans, served from the app's own domain -- the
//      browser loads no font from a Google address
//
// next/font/local gives each family a generated name (not "Archivo"), so the
// check reads the font the browser actually used for the element, through
// the DevTools protocol, rather than the CSS string.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";

async function usedFont(page: Page, selector: string): Promise<{ familyName: string; fontWeight: string }> {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument");
  // Fonts are reported for a node's own text only, so take the first match
  // that has text of its own (the wordmark's text sits in child spans).
  const { nodeIds } = await client.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: `${selector}, ${selector} *` });
  let fonts: { familyName: string }[] = [];
  for (const nodeId of nodeIds) {
    ({ fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId }));
    if (fonts.length > 0) break;
  }
  const weight = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontWeight);
  return { familyName: fonts[0].familyName, fontWeight: weight };
}

function watchFontRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") urls.push(request.url());
  });
  return urls;
}

function expectOwnDomainOnly(urls: string[], page: Page) {
  expect(urls.length).toBeGreaterThan(0);
  const own = new URL(page.url()).origin;
  for (const url of urls) {
    expect(new URL(url).origin).toBe(own);
    expect(url).not.toMatch(/googleapis|gstatic/);
  }
}

async function checkPage(page: Page, fontUrls: string[]) {
  await page.evaluate(() => document.fonts.ready);

  // Headings at 800 (the shared heading class) and the wordmark at 900 are
  // both Archivo; body text is Public Sans.
  const heading = await usedFont(page, ".font-heading.font-extrabold");
  expect(heading.familyName).toMatch(/archivo/i);
  expect(heading.fontWeight).toBe("800");
  const wordmark = await usedFont(page, "span.font-heading.font-black");
  expect(wordmark.familyName).toMatch(/archivo/i);
  expect(wordmark.fontWeight).toBe("900");
  expect((await usedFont(page, "p:not(.font-heading)")).familyName).toMatch(/public ?sans/i);
  expectOwnDomainOnly(fontUrls, page);
}

test("AC3: an ops page - Archivo headings, Public Sans body, fonts from our own domain", async ({ page }) => {
  const fontUrls = watchFontRequests(page);
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.locator(".font-heading.font-extrabold").first()).toBeVisible();
  await checkPage(page, fontUrls);
});

test("AC3: a contractor page - Archivo headings, Public Sans body, fonts from our own domain", async ({ page }) => {
  const fontUrls = watchFontRequests(page);
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await checkPage(page, fontUrls);
});
