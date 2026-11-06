// Feature 2005 -- contractor My details, at the contractor portal's primary (phone) viewport.
//
// AC1  My details is on Bob's menu and opens /contractor/details
// AC2  Bob edits his name, phone, business name, address and emergency contact and they hold after a reload
// AC3  everything else sits in the same form frozen with a padlock -- the bank details too -- and cannot be changed, on the screen or by sending it
// AC4  the address has no state check; Operating state does not change
//
// Everything Bob changes is put back afterwards. The bank details are never touched (they are the office's).
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

test.use(MOBILE_VIEWPORT);

interface Own {
  name: string;
  phone: string;
  businessName: string | null;
  address: unknown;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
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
  // one form in one card, the hint under its heading, Save at the end
  const form = page.getByTestId("my-details-form");
  await expect(form.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(form.getByText("Fields with a padlock are set by the office. Please call the office to change them.")).toBeVisible();
  await expect(form.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^(Address|Emergency contact|Bank details|Set by the office)/ })).toHaveCount(0);
});

test("AC2: name, phone, business name and emergency contact save, show Saved and hold after a reload; a blank name is refused", async ({ page }) => {
  await page.getByLabel("Name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Required.").first()).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill("Robert Reilly");
  await page.getByLabel("Phone", { exact: true }).fill("0400 111 222");
  await page.getByLabel("Business name").fill("Reilly and Son Plumbing");
  await page.getByLabel("Emergency contact name").fill("Ann Reilly");
  await page.getByLabel("Emergency contact phone").fill("0400 000 321");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Robert Reilly");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("0400 111 222");
  await expect(page.getByLabel("Business name")).toHaveValue("Reilly and Son Plumbing");
  await expect(page.getByLabel("Emergency contact name")).toHaveValue("Ann Reilly");
});

test("AC3: the rest sits among the fields frozen with a padlock, bank details included, and sending it changes nothing", async ({ page }) => {
  const form = page.getByTestId("my-details-form");
  const locked = form.getByTestId("locked-field");
  await expect(locked).toHaveCount(11); // code, email, ABN, GST, state, trade, insurance, BSB, account number, account name, status
  for (const text of ["CON-014", "bob@idelta.com.au", "WA", "066-000", "12345678", "B Reilly"]) await expect(locked.getByText(text, { exact: true }).first()).toBeVisible();
  for (const label of ["BSB", "Account number", "Account name"]) await expect(locked.getByText(label, { exact: true })).toBeVisible();
  await expect(locked.locator("input, textarea, select")).toHaveCount(0);

  const res = await page.request.put(`${apiUrl}/api/contractor/details`, {
    data: { ...original, email: "not-bob@idelta.com.au", operatingState: "NSW", status: "suspended", payoutBsb: "062-000", payoutAccountNo: "99887766", payoutAccountName: "Not Bob" },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { office: { email: string; operatingState: string; status: string; payoutBsb: string; payoutAccountNo: string } };
  expect(body.office).toMatchObject({ email: "bob@idelta.com.au", operatingState: "WA", status: "active", payoutBsb: "066-000", payoutAccountNo: "12345678" });
});

test("AC4: an address in a state we do not operate in is saved, and the Operating state stays", async ({ page }) => {
  const address = { street: "1 Collins Street", suburb: "Melbourne", state: "VIC", country: "AU", postcode: "3000", lat: -37.81, lng: 144.96, placeId: "e2e-melbourne" };
  const res = await page.request.put(`${apiUrl}/api/contractor/details`, { data: { ...original, address } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { own: { address: { state: string } }; office: { operatingState: string } };
  expect(body.own.address.state).toBe("VIC");
  expect(body.office.operatingState).toBe("WA");
});
