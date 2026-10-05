// A throwaway dispatched job -- Feature 4003, accept / decline.
//
// The respond link only ever exists inside a delivered message (ADR 0004,
// minting belongs to the Notification module), so a browser test gets one the
// way Bob does: Mike dispatches a job and Bob's text carries the link. The
// interim /api/dev/texts feed shows that text (no ClickSend here), and the
// running dev process drains its queue on its own 15-second interval.
//
// Every call writes a REAL, PERMANENT Customer + Job + Assignment + calendar
// block for Bob -- a throwaway because each test needs its own subject (the
// implementor skill, the second rule of the tests), never out of tidiness.
// Bob's calendar is shared state and has no delete, so the caller hands each
// job to `freeBobsHold` in afterEach: a decline frees the block, and an
// already-answered link just says so.
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

const FREMANTLE = { suburb: "Fremantle", state: "WA", country: "AU", postcode: "6160", lat: -32.0569, lng: 115.7439 };

interface Slot {
  date: string;
  startMinutes: number;
}

/**
 * A random Tuesday-to-Friday half hour between 7:00am and 4:00pm, 1-17 weeks
 * after Monday 2027-03-01 -- inside Bob's fixture licence (30/06/27). Never a
 * Monday morning and never a weekend: 4002's own spec books Monday 7-10am
 * slots from a finite pool, and a weekend would state the weekend price.
 */
function candidateSlot(): Slot {
  const day = new Date("2027-03-01T00:00:00.000Z");
  day.setUTCDate(day.getUTCDate() + 7 * (1 + Math.floor(Math.random() * 17)) + 1 + Math.floor(Math.random() * 4));
  return { date: day.toISOString().slice(0, 10), startMinutes: 420 + 30 * Math.floor(Math.random() * 18) };
}

async function pickFreeSlot(page: Page): Promise<Slot> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = candidateSlot();
    const res = await page.request.get(`${apiUrl}/api/contractors/CON-014/day?date=${candidate.date}`);
    if (!res.ok()) continue;
    const { blocks } = (await res.json()) as { blocks: { startMinutes: number; endMinutes: number }[] };
    if (!blocks.some((block) => block.startMinutes < candidate.startMinutes + 60 && block.endMinutes > candidate.startMinutes)) {
      return candidate;
    }
  }
  throw new Error("could not find a free slot for Bob after 60 attempts");
}

/**
 * V1 (4003): a free weekday MORNING for Bob -- any Monday to Friday between
 * 2026-12-14 and 2027-06-25 (inside his fixture licence, 30/06/27) whose
 * 7:00-10:00am is clear -- for specs that book the 7-10am window and need the
 * date itself (4002's dispatch spec). About 140 days, not 20 Mondays, so a
 * year of permanent bookings does not run it dry. Requires `page` signed in
 * as an ops user (Bob's day is an ops-only read).
 */
export async function pickFreeWeekday(page: Page): Promise<string> {
  const first = new Date("2026-12-14T00:00:00.000Z");
  const weekdays: string[] = [];
  for (let offset = 0; offset <= 193; offset += 1) {
    const day = new Date(first.getTime() + offset * 86_400_000);
    if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5) weekdays.push(day.toISOString().slice(0, 10));
  }
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = weekdays[Math.floor(Math.random() * weekdays.length)] ?? "";
    const res = await page.request.get(`${apiUrl}/api/contractors/CON-014/day?date=${candidate}`);
    if (!res.ok()) continue;
    const { blocks } = (await res.json()) as { blocks: { startMinutes: number; endMinutes: number }[] };
    if (!blocks.some((block) => block.startMinutes < 600 && block.endMinutes > 420)) return candidate;
  }
  throw new Error("could not find a free weekday morning for Bob after 80 attempts");
}

/** The first Saturday after `date` (a weekday) -- the weekend-price day. */
export function saturdayAfter(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + (6 - day.getUTCDay()));
  return day.toISOString().slice(0, 10);
}

export interface DispatchedJob {
  reference: string;
  /** The respond page's path, `/a/<token>`, read from Bob's text. */
  respondPath: string;
  /** The raw token, for a direct call to the respond API. */
  token: string;
}

export async function dispatchThrowawayJob(
  page: Page,
  request: APIRequestContext,
  tag: string,
  options: {
    siteContact?: { name: string; phone: string };
    /** Feature 3003: photos on the enquiry, as the form would send them. */
    photos?: { storageKey: string; fileName: string }[];
  } = {},
): Promise<DispatchedJob> {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");

  const stamp = String(Date.now());
  const enquiry = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name: `E2E 4003 ${tag}`,
      email: `e2e-4003-${tag}-${stamp}@idelta.com.au`,
      phone: "0400 000 403",
      location: { ...FREMANTLE, placeId: `e2e-4003-place-${tag}-${stamp}` },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: "2027-03-01",
      preferredWindow: "morning",
      description: "An e2e throwaway job for feature 4003.",
      marketingEmail: false,
      marketingSms: false,
      ...(options.photos ? { photos: options.photos } : {}),
    },
  });
  expect(enquiry.status()).toBe(201);
  const { reference } = (await enquiry.json()) as { reference: string };

  const saved = await page.request.put(`${apiUrl}/api/jobs/${reference}/addresses`, {
    data: {
      billingAddress: { street: "14 Marine Terrace", ...FREMANTLE, placeId: `e2e-4003-billing-${stamp}` },
      site: { sameAsBilling: true },
      ...(options.siteContact ? { siteContact: options.siteContact } : {}),
    },
  });
  expect(saved.status()).toBe(200);

  // Two of this file's tests run at once and may pick the same slot for
  // Bob: a busy answer (409) just means pick another.
  let dispatchedStatus = 0;
  for (let attempt = 0; attempt < 8 && dispatchedStatus !== 201; attempt += 1) {
    const slot = await pickFreeSlot(page);
    const dispatched = await page.request.post(`${apiUrl}/api/jobs/${reference}/dispatch`, {
      data: { contractorCode: "CON-014", date: slot.date, startMinutes: slot.startMinutes, holdMinutes: 60, emergency: false },
    });
    dispatchedStatus = dispatched.status();
    if (dispatchedStatus !== 201) expect(dispatchedStatus).toBe(409);
  }
  expect(dispatchedStatus).toBe(201);

  // Bob's text, read back from the interim feed once the dispatcher has drained it.
  let respondPath = "";
  await expect
    .poll(
      async () => {
        const res = await request.get(`${apiUrl}/api/dev/texts`);
        const { blocks } = (await res.json()) as {
          blocks: { jobReference: string; texts: { recipientBadge: string; text: string }[] }[];
        };
        const text = blocks
          .filter((block) => block.jobReference === reference)
          .flatMap((block) => block.texts)
          .find((row) => row.recipientBadge === "CONTRACTOR SMS")?.text;
        const match = text ? /https?:\/\/\S+\/a\/([A-Za-z0-9_-]+)/.exec(text) : null;
        respondPath = match ? `/a/${match[1] ?? ""}` : "";
        return respondPath;
      },
      { timeout: 45_000, intervals: [2_000] },
    )
    .not.toBe("");
  return { reference, respondPath, token: respondPath.slice("/a/".length) };
}

/**
 * afterEach: free Bob's block on every throwaway the test left waiting for an
 * answer. Detects the state it finds -- a link the test already answered
 * refuses (410), which is fine -- and never assumes where the test died.
 */
export async function freeBobsHold(request: APIRequestContext, jobs: DispatchedJob[]): Promise<void> {
  for (const job of jobs) {
    await request.post(`${apiUrl}/api/respond/${job.token}/decline`, { data: { note: "e2e cleanup" } });
  }
}
