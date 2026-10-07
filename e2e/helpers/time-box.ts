// The Time box -- Feature 5001. One box with an hour part and a minute part you type into, plus
// AM | PM buttons, so a test sets "8:07am" the way a person does.
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
  const [hour, minute] = digits.split(":");
  await page.locator(selector).fill(hour ?? "");
  await page.locator(`${selector}-minute`).fill(minute ?? "");
}

export async function expectTime(page: Page, selector: string, time: string): Promise<void> {
  const { digits, meridiem } = split(time);
  const [hour, minute] = digits.split(":");
  await expect(page.locator(selector)).toHaveValue(hour ?? "");
  await expect(page.locator(`${selector}-minute`)).toHaveValue(minute ?? "");
  await expect(page.locator(`${selector}-${meridiem}`)).toHaveAttribute("aria-pressed", "true");
}
