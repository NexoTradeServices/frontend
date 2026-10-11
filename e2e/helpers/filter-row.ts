// The shared Filter row's browser checks -- Feature 9001 AC9
// (frontend-conventions / Molecules / Finding and filtering, Filter row).
import { expect, type Locator, type Page } from "@playwright/test";

const INK = "rgb(28, 43, 58)";
const HAIRLINE = "rgb(230, 226, 219)";

/** The row is a group of pills: 8px apart, the chosen one ink with no border, the others hairline-bordered. */
export async function expectPillsLookRight(group: Locator): Promise<void> {
  const pills = group.getByRole("button");
  const lefts = await pills.evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }),
  );
  expect(lefts.length).toBeGreaterThan(2);
  // Two pills side by side on one line sit 8px apart.
  for (let i = 1; i < lefts.length; i += 1) {
    const before = lefts[i - 1];
    const here = lefts[i];
    if (before !== undefined && here !== undefined && Math.round(before.top) === Math.round(here.top)) {
      expect(Math.round(here.left - before.right)).toBe(8);
    }
  }
  const chosen = group.locator('[aria-pressed="true"]');
  await expect(chosen).toHaveCount(1);
  await expect(chosen).toHaveCSS("background-color", INK);
  await expect(chosen).toHaveCSS("border-top-width", "0px");
  await expect(chosen).toHaveCSS("color", "rgb(255, 255, 255)");
  const other = group.locator('[aria-pressed="false"]').first();
  await expect(other).toHaveCSS("border-top-color", HAIRLINE);
  await expect(other).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(pills.first()).toHaveCSS("height", "44px");
}

/** Phone: one line, scrolls sideways, no scrollbar, snapping, the edge fade, the chosen pill in view. */
export async function expectFilterRowOnPhone(page: Page, group: Locator): Promise<void> {
  await expectPillsLookRight(group);
  const tops = await group.getByRole("button").evaluateAll((buttons) => buttons.map((b) => Math.round(b.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);

  const overflow = await group.evaluate((row) => ({ scrollWidth: row.scrollWidth, clientWidth: row.clientWidth }));
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  await expect(group).toHaveCSS("scrollbar-width", "none");
  await expect(group).toHaveCSS("scroll-snap-type", /^x/);

  // The chosen pill is in view, inside the row's own box.
  const inView = await group.evaluate((row) => {
    const chosen = row.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chosen) return false;
    const a = chosen.getBoundingClientRect();
    const b = row.getBoundingClientRect();
    return a.left >= b.left - 1 && a.right <= b.right + 1;
  });
  expect(inView).toBe(true);

  // The edge fade: on the right while there is more, on the left once the row has scrolled.
  const wrapper = group.locator("xpath=..");
  await expect(wrapper.locator('[data-fade="right"]')).toHaveCount(1);
  await group.evaluate((row) => {
    row.scrollLeft = row.scrollWidth;
  });
  await expect(wrapper.locator('[data-fade="left"]')).toHaveCount(1);
  // The row scrolls; the page never does.
  const page$ = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(page$.scrollWidth).toBeLessThanOrEqual(page$.clientWidth);
}

/** Tablet and up: the row wraps and never scrolls on its own. */
export async function expectFilterRowWraps(group: Locator): Promise<void> {
  await expectPillsLookRight(group);
  await expect(group).toHaveCSS("flex-wrap", "wrap");
  await expect(group).toHaveCSS("overflow-x", "visible");
  const overflow = await group.evaluate((row) => ({ scrollWidth: row.scrollWidth, clientWidth: row.clientWidth }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}
