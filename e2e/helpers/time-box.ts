// The Time box -- Feature 5001. Three dropdowns (hour, minute, am/pm), so a test
// picks "8:07am" the way a person does.
import { expect, type Page } from "@playwright/test";

/** `selector` is the box's own id, "#entry-0-start"; `time` reads "8:07am". */
export async function pickTime(page: Page, selector: string, time: string): Promise<void> {
  const match = /^(\d{1,2}):(\d{2})(am|pm)$/.exec(time);
  if (!match) throw new Error(`"${time}" is not a time like 8:07am`);
  await page.locator(`${selector}-hour`).selectOption(match[1] ?? "");
  await page.locator(`${selector}-minute`).selectOption(match[2] ?? "");
  await page.locator(`${selector}-meridiem`).selectOption(match[3] ?? "");
}

export async function expectTime(page: Page, selector: string, time: string): Promise<void> {
  const match = /^(\d{1,2}):(\d{2})(am|pm)$/.exec(time);
  if (!match) throw new Error(`"${time}" is not a time like 8:07am`);
  await expect(page.locator(`${selector}-hour`)).toHaveValue(match[1] ?? "");
  await expect(page.locator(`${selector}-minute`)).toHaveValue(match[2] ?? "");
  await expect(page.locator(`${selector}-meridiem`)).toHaveValue(match[3] ?? "");
}
