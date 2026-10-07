// The Time box -- Feature 5001. A box you type the digits into plus AM | PM
// buttons, so a test sets "8:07am" the way a person does.
import { expect, type Page } from "@playwright/test";

function split(time: string): { digits: string; meridiem: "am" | "pm" } {
  const match = /^(\d{1,2}:\d{2})(am|pm)$/.exec(time);
  if (!match) throw new Error(`"${time}" is not a time like 8:07am`);
  return { digits: match[1] ?? "", meridiem: match[2] as "am" | "pm" };
}

/** `selector` is the box's own id, "#entry-0-start"; `time` reads "8:07am". */
export async function pickTime(page: Page, selector: string, time: string): Promise<void> {
  const { digits, meridiem } = split(time);
  await page.locator(`${selector}-${meridiem}`).click();
  await page.locator(selector).fill(digits);
}

export async function expectTime(page: Page, selector: string, time: string): Promise<void> {
  const { digits, meridiem } = split(time);
  await expect(page.locator(selector)).toHaveValue(digits);
  await expect(page.locator(`${selector}-${meridiem}`)).toHaveAttribute("aria-pressed", "true");
}
