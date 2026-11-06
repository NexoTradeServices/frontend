// Feature 2005 -- contractor My details, at the contractor portal's primary (phone) viewport.
//
// AC1  My details is on Bob's menu and opens /contractor/details
// AC2  Bob edits address, emergency contact and bank details and they hold after a reload; a bad BSB is refused
// AC3  everything else shows under "Set by the office" and cannot be changed, on the screen or by sending it
// AC4  the address has no state check; Operating state does not change
//
// Bob's bank details are never CHANGED here (a replacement queues the Bank details changed email); the bank
// fields are saved as loaded. The replace / first-entry emails are proved in the backend tests.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

test.use(MOBILE_VIEWPORT);

interface Own {
  address: unknown;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  payoutBsb: string | null;
  payoutAccountNo: string | null;
  payoutAccountName: string | null;
}

let original: Own | null = null;

async function openAsBob(page: Page): Promise<void> {
  await page.goto("/contractor/details");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "My details", level: 1 })).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await openAsBob(page);
  original = ((await (await page.request.get(`${apiUrl}/api/contractor/details`)).json()) as { own: Own }).own;
});

test.afterEach(async ({ page }) => {
  if (original !== null) await page.request.put(`${apiUrl}/api/contractor/details`, { data: original });
});

test("AC1: My details is on the menu and opens the page", async ({ page }) => {
  await page.goto("/contractor");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "My details" }).click();
  await expect(page).toHaveURL(/\/contractor\/details$/);
  await expect(page.getByRole("heading", { name: "My details", level: 1 })).toBeVisible();
  for (const card of ["Address", "Emergency contact", "Bank details"]) await expect(page.getByRole("heading", { name: new RegExp(`^${card}`) })).toBeVisible();
});

test("AC2: an emergency contact saves, shows Saved and holds after a reload; a bad BSB is refused and nothing is sent", async ({ page }) => {
  await page.getByLabel("Name", { exact: true }).fill("Ann Reilly");
  await page.getByLabel("Phone", { exact: true }).fill("0400 000 321");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ann Reilly");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("0400 000 321");

  const bsb = page.getByLabel("BSB");
  const before = await bsb.inputValue();
  await bsb.fill("12345");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("A BSB is six digits.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("BSB")).toHaveValue(before);
});

test("AC3: the rest sits under Set by the office, frozen, and sending it changes nothing", async ({ page }) => {
  const office = page.getByTestId("office-card");
  await expect(office.getByRole("heading", { name: /Set by the office/ })).toBeVisible();
  await expect(office.getByText("Ring the office to change any of these.")).toBeVisible();
  for (const text of ["Bob Reilly", "CON-014", "bob@idelta.com.au", "WA"]) await expect(office.getByText(text, { exact: true }).first()).toBeVisible();
  await expect(office.locator("input, textarea, select")).toHaveCount(0);

  const res = await page.request.put(`${apiUrl}/api/contractor/details`, { data: { ...original, name: "Not Bob", operatingState: "NSW", status: "suspended" } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { office: { name: string; operatingState: string; status: string } };
  expect(body.office).toMatchObject({ name: "Bob Reilly", operatingState: "WA", status: "active" });
});

test("AC4: an address in a state we do not operate in is saved, and the Operating state stays", async ({ page }) => {
  const address = { street: "1 Collins Street", suburb: "Melbourne", state: "VIC", country: "AU", postcode: "3000", lat: -37.81, lng: 144.96, placeId: "e2e-melbourne" };
  const res = await page.request.put(`${apiUrl}/api/contractor/details`, { data: { ...original, address } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { own: { address: { state: string } }; office: { operatingState: string } };
  expect(body.own.address.state).toBe("VIC");
  expect(body.office.operatingState).toBe("WA");
});
