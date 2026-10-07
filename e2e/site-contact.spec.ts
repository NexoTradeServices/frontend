// Feature 4008 -- site contact, frontend e2e (ADR 0001).
//
// AC2  (UI) Mike types Lena on a job and presses Save: the toast, and the API holds her
// AC17 the Site contact group shows no stars while empty; typing a name stars Name and
//      Phone, emptying it takes them away
// AC18 Save with a name and no phone stays pressable, shows "Required." under Phone and
//      saves nothing
// AC13-AC16 (UI) the Messages card lists the job's messages, to whom, how, when, what and
//      where each stands -- a table on desktop, cards on a phone
//
// AC20's on-screen half (a completed job's site contact read-only) has no test here: no
// completed job exists in the seeded cast and nothing in the app can complete one yet --
// change.md V1. The read behind it is proven at the backend (site-contact.test.ts AC20).
//
// Every job this file touches is its own: a throwaway enquiry (a permanent Customer + Job
// row, nothing is ever deleted) carrying an e2e-4008-... email. No seeded job is written to.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

async function postEnquiry(request: APIRequestContext, tag: string, name: string): Promise<string> {
  const res = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name,
      email: `e2e-4008-${tag}-${String(Date.now())}@idelta.com.au`,
      phone: "0400 000 408",
      location: {
        suburb: "Fremantle",
        state: "WA",
        country: "AU",
        postcode: "6160",
        lat: -32.0569,
        lng: 115.7439,
        placeId: "e2e-place-fremantle",
      },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: "2026-12-01",
      preferredWindow: "morning",
      description: "Kitchen mixer tap is leaking from the base.",
      marketingEmail: false,
      marketingSms: false,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { reference: string }).reference;
}

async function openJob(page: Page, reference: string): Promise<void> {
  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
}

async function star(page: Page, id: string): Promise<string> {
  return page.locator(`label[for="${id}"]`).evaluate((el) => getComputedStyle(el, "::after").content);
}

test("AC17: the Site contact group shows no stars while empty; a name stars Name and Phone, emptying it takes them away", async ({
  page,
  request,
}) => {
  const reference = await postEnquiry(request, "ac17", "Karl");
  await openJob(page, reference);
  const group = page.getByTestId("site-contact");
  await expect(group.getByText("Enter if someone other than the customer will be on site")).toBeVisible();

  for (const id of ["site-contact-name", "site-contact-phone", "site-contact-email"]) {
    expect(await star(page, id)).toBe("none");
  }
  await page.locator("#site-contact-name").fill("Lena Park");
  expect(await star(page, "site-contact-name")).toBe('"*"');
  expect(await star(page, "site-contact-phone")).toBe('"*"');
  expect(await star(page, "site-contact-email")).toBe("none");

  await page.locator("#site-contact-name").fill("");
  for (const id of ["site-contact-name", "site-contact-phone", "site-contact-email"]) {
    expect(await star(page, id)).toBe("none");
  }
});

test("AC18: Save with a name and no phone stays pressable, says Required. under Phone, and saves nothing", async ({
  page,
  request,
}) => {
  const reference = await postEnquiry(request, "ac18", "Karl");
  await openJob(page, reference);

  await page.locator("#site-contact-name").fill("Lena Park");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled();
  await save.click();

  await expect(group(page).getByText("Required.", { exact: true })).toHaveCount(1);
  await expect(page.locator("#site-contact-phone")).toHaveAttribute("aria-invalid", "true");
  await expect(save).toBeEnabled();
  await expect(page.getByText(`Saved ${reference}.`)).toHaveCount(0);
  // That nothing was stored is proven at the backend, tests/site-contact.test.ts AC3.
});

function group(page: Page) {
  return page.getByTestId("site-contact");
}

test("AC2: Mike types Lena Park, her phone and email and presses Save -- the email error, the toast, Save quiet again", async ({
  page,
  request,
}) => {
  const reference = await postEnquiry(request, "ac2", "Karl");
  await openJob(page, reference);

  await page.locator("#site-contact-name").fill("Lena Park");
  await page.locator("#site-contact-phone").fill("0400 002 050");
  await page.locator("#site-contact-email").fill("lena@");
  await page.locator("#site-contact-email").blur();
  await expect(group(page).getByText("That does not look like an email address.")).toBeVisible();

  await page.locator("#site-contact-email").fill("lena@idelta.com.au");
  await expect(group(page).getByText("That does not look like an email address.")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(`Saved ${reference}.`)).toBeVisible();
  // What the job holds is proven at the backend, tests/site-contact.test.ts AC2.
  // Saved: quiet again until the next change.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
});

test("AC13-AC16: the Messages card lists the enquiry's two messages -- to whom, how, when, what and where each stands -- in a table, under Contractor", async ({
  page,
  request,
}) => {
  const reference = await postEnquiry(request, "msgs", "Karl Messages");
  await openJob(page, reference);

  const card = page.locator("section", { has: page.getByRole("heading", { name: "Messages", exact: true }) });
  const rows = card.getByTestId("message-row");
  await expect(rows).toHaveCount(2);
  const words = /^(Waiting to send|Sent|Delivered|Failed)/i;
  for (const [what, to] of [
    ["Enquiry received", "Karl Messages"],
    ["New job request", "Office inbox"],
  ] as const) {
    const row = rows.filter({ hasText: what });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(to);
    await expect(row).toContainText("Email");
    await expect(row).toContainText(/\d{2}\/\d{2}\/\d{2} \d{1,2}:\d{2}(am|pm)/);
    await expect(row.locator("[data-message-status]")).toHaveText(words);
  }
  await expect(card.getByTestId("message-card").first()).toBeHidden();

  // Desktop: left column, under the Contractor card.
  const contractor = await page.getByRole("heading", { name: "Contractor", exact: true }).boundingBox();
  const messages = await card.getByRole("heading", { name: "Messages", exact: true }).boundingBox();
  expect(messages?.x).toBeCloseTo(contractor?.x ?? -1, 0);
  expect(messages?.y ?? 0).toBeGreaterThan(contractor?.y ?? 0);
  // V2: Operator notes follow Messages in the same column.
  const notes = await page.getByRole("heading", { name: "Operator notes", exact: true }).boundingBox();
  expect(notes?.x).toBeCloseTo(messages?.x ?? -1, 0);
  expect(notes?.y ?? 0).toBeGreaterThan(messages?.y ?? Number.POSITIVE_INFINITY);
});

test.describe("on a phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("AC13-AC16: below 768px the Messages card is cards, not a table, with Operator notes after it", async ({ page, request }) => {
    const reference = await postEnquiry(request, "phone", "Karl Phone");
    await openJob(page, reference);

    const card = page.locator("section", { has: page.getByRole("heading", { name: "Messages", exact: true }) });
    await expect(card.getByTestId("message-card")).toHaveCount(2);
    await expect(card.getByTestId("message-row").first()).toBeHidden();
    await expect(card.getByTestId("message-card").filter({ hasText: "Enquiry received" })).toContainText("To Karl Phone");

    // V2: Operator notes come after Messages, so notes are last.
    const notes = await page.getByRole("heading", { name: "Operator notes", exact: true }).boundingBox();
    const messages = await card.getByRole("heading", { name: "Messages", exact: true }).boundingBox();
    expect(notes?.y ?? 0).toBeGreaterThan(messages?.y ?? Number.POSITIVE_INFINITY);
  });
});
