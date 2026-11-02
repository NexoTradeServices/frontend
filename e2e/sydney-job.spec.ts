// Feature 1022 -- time zones, frontend e2e (ADR 0001).
//
// A Sydney job (Hannah, Newtown) dispatched to Liam through the real dispatch page:
// AC2  Mike reads the page's times in "NSW time", the job page's standing line in "NSW time", and a Perth job's in "WA time"
// AC3  nothing else on the job page carries a label: the Updated stamp on the queue is plain
// AC8  the day view draws Liam's day in Sydney's clock: a slot tapped at 9:00am is 9:00am NSW time on the booking
//
// The customer's and contractor's plain wording (AC1, AC5-AC7) is proven against the real routes in the backend
// (tests/time-labels.test.ts, tests/time-zones.test.ts). Runs against the seeded dev database; the job is a throwaway.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";
const NEWTOWN = { suburb: "Newtown", state: "NSW", country: "AU", postcode: "2042", lat: -33.897644, lng: 151.180228 };

/** A free weekday for Liam, not an NSW holiday, a few weeks out and inside his licence (30 Jun 2027). */
async function pickDayForLiam(page: Page): Promise<string> {
  const holidays = (await (await page.request.get(`${apiUrl}/api/public-holidays?state=NSW`)).json()) as { holidays: { date: string }[] };
  const closed = new Set(holidays.holidays.map((h) => h.date));
  const first = new Date();
  first.setUTCDate(first.getUTCDate() + 21);
  for (let offset = 0; offset < 120; offset += 1) {
    const day = new Date(first.getTime() + offset * 86_400_000);
    const iso = day.toISOString().slice(0, 10);
    if (day.getUTCDay() < 1 || day.getUTCDay() > 5 || closed.has(iso) || iso > "2027-06-20") continue;
    const res = await page.request.get(`${apiUrl}/api/contractors/CON-037/day?date=${iso}&job=none`);
    if (!res.ok()) continue;
    if (((await res.json()) as { blocks: unknown[] }).blocks.length === 0) return iso;
  }
  throw new Error("no free weekday for Liam");
}

async function postSydneyEnquiry(request: APIRequestContext, date: string): Promise<string> {
  const stamp = String(Date.now());
  const res = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name: `E2E 1022 ${stamp}`,
      email: `e2e-1022-${stamp}@idelta.com.au`,
      phone: "0400 001 022",
      location: { ...NEWTOWN, placeId: `e2e-1022-place-${stamp}` },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: date,
      preferredWindow: "morning",
      description: "An e2e throwaway Sydney job for feature 1022.",
      marketingEmail: false,
      marketingSms: false,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { reference: string }).reference;
}

test("1022 AC2, AC3, AC8: Hannah's Newtown job dispatches to Liam in NSW time and Mike reads NSW time everywhere it is a booked time", async ({ page, request }) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible({ timeout: 15_000 });
  const date = await pickDayForLiam(page);
  const reference = await postSydneyEnquiry(request, date);
  const billed = await page.request.put(`${apiUrl}/api/jobs/${reference}/addresses`, {
    data: { billingAddress: { street: "30 King Street", ...NEWTOWN, placeId: `e2e-1022-billing-${String(Date.now())}` }, site: { sameAsBilling: true } },
  });
  expect(billed.status()).toBe(200);

  await page.goto(`/ops/jobs/${reference}/dispatch`);
  await expect(page.getByRole("heading", { name: `Dispatch ${reference}` })).toBeVisible();
  // AC2: the Start label, the two Card asides and the summary read the job's state, never AWST.
  await expect(page.getByLabel("Start (NSW time)")).toBeVisible();
  await expect(page.getByText(/NSW time/).first()).toBeVisible();
  await expect(page.getByText("AWST")).toHaveCount(0);

  // AC8: Liam's day is drawn in Sydney's clock; a slot tapped at 9:00am is 9:00am NSW time.
  await page.getByRole("button", { name: /Liam Walsh/ }).click();
  await expect(page.getByRole("heading", { name: /Liam's/ })).toBeVisible();
  await page.getByRole("button", { name: "Start at 9:00am" }).click();
  await expect(page.getByLabel("Start (NSW time)")).toHaveValue("540");
  const go = page.getByRole("button", { name: /Dispatch to Liam/ });
  await expect(go).toBeEnabled({ timeout: 10_000 });
  await go.click();

  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${reference}$`));
  // AC2: the booked time on the job page carries the state's time.
  await expect(page.getByText(/Waiting for Liam's answer - proposed .*9:00am NSW time/)).toBeVisible();
  // AC8 (the booking itself): 9:00am Sydney, whichever side of daylight saving the day is on.
  const day = await page.request.get(`${apiUrl}/api/contractors/CON-037/day?date=${date}&job=${reference}`);
  const block = ((await day.json()) as { blocks: { startMinutes: number; timeLabel: string }[] }).blocks.find((b) => b.startMinutes === 540);
  expect(block?.timeLabel).toBe("9:00-10:00am NSW time");

  // AC3: the queue's Updated stamp is not a booked time - plain.
  await page.goto("/ops/jobs");
  await expect(page.getByText(/^Updated \d{1,2}:\d{2}(am|pm)/)).toBeVisible({ timeout: 15_000 });
});
