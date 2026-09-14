// Feature 4002 -- dispatch to assignment, frontend e2e (ADR 0001).
//
// AC1  a new job's Contractor card shows Dispatch, opening the dispatch page
// AC2  a job with no address at all: Dispatch is off, with the reason
// AC6  the dispatch page opens on the job's preferred date at its window's
//      start with a 1-hour hold, the field reading "Start (AWST)"
// AC17 picking a contractor opens his day; Previous/Next day moves it
// AC18 tapping a half hour moves the start there, keeping the hold's length
// AC19 a busy contractor still opens his day; a Not ready one does not
// AC22 the price shown follows the day (a Saturday reads the weekend rate)
// AC29 after dispatch the job page shows Assigned, waiting for his answer,
//      and the service level with its price
// AC34 the interim /dev/texts page carries the dispatch's block
// AC41 at 390px every action on the dispatch page is reachable, no sideways
//      scroll, every tap target at least 44px
//
// Runs against the seeded dev database (`npm run db:seed:fixtures`). Every
// enquiry this file posts is a genuine, permanent Customer + Job row, each
// carrying its own throwaway e2e-4002-... email so it never touches the
// cast; every job it dispatches is one of its own, never a seeded one.
import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

const FREMANTLE = { suburb: "Fremantle", state: "WA", country: "AU", postcode: "6160", lat: -32.0569, lng: 115.7439 };
const JOONDALUP = { suburb: "Joondalup", state: "WA", country: "AU", postcode: "6027", lat: -31.7448, lng: 115.7661 };

async function postEnquiry(
  request: APIRequestContext,
  tag: string,
  trade: "Plumbing" | "Electrical",
  location: typeof FREMANTLE,
  preferredDate: string,
): Promise<string> {
  const res = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name: `E2E 4002 ${tag}`,
      email: `e2e-4002-${tag}-${String(Date.now())}@idelta.com.au`,
      phone: "0400 000 402",
      location: { ...location, placeId: `e2e-4002-place-${tag}-${String(Date.now())}` },
      trade,
      selectedOptions: [],
      preferredDate,
      preferredWindow: "morning",
      description: "An e2e throwaway job for feature 4002.",
      marketingEmail: false,
      marketingSms: false,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { reference: string }).reference;
}

/** Bypasses the Addresses card (already proven at 4001) -- sets a billing address directly, on Mike's own session. */
async function putBillingAddress(page: Page, reference: string): Promise<void> {
  const res = await page.request.put(`${apiUrl}/api/jobs/${reference}/addresses`, {
    data: {
      billingAddress: { street: "14 Marine Terrace", ...FREMANTLE, placeId: `e2e-4002-billing-${String(Date.now())}` },
      site: { sameAsBilling: true },
    },
  });
  expect(res.status()).toBe(200);
}

const MONDAY = "2026-12-07";

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * A fresh Monday, picked at random -- every test that actually calls POST
 * dispatch writes a REAL, PERMANENT CalendarEvent for Bob (this suite's
 * jobs are never deleted, matching every other e2e spec's own convention),
 * so a fixed date collides with an earlier run's leftover booking and reads
 * a false "busy". Read-only tests (never past the candidate list) keep the
 * plain MONDAY constant above -- nothing they do can collide.
 *
 * Bounded to 1-20 weeks out (mid-December 2026 to late April 2027): Bob's
 * fixture licence expires 30/06/27 and his insurance 28/02/28 (cast.md via
 * fixtures.ts) -- picking wide enough to land past either would read a
 * genuine "Not ready" instead of proving the busy path this is for.
 */
function freshMonday(): string {
  return addDays(MONDAY, 7 * (1 + Math.floor(Math.random() * 20)));
}

/**
 * `freshMonday()`, but actually checked against Bob's real calendar first --
 * only ~20 candidate Mondays exist (bounded by his licence), and after
 * enough feel-pass re-runs across one session a random pick collides with
 * an earlier run's own leftover booking (found live, 14/09/26). Requires
 * `page` already signed in as an ops user (Bob's day is an ops-only read).
 */
async function pickFreeMonday(page: Page): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = freshMonday();
    const res = await page.request.get(`${apiUrl}/api/contractors/CON-014/day?date=${candidate}`);
    if (!res.ok()) continue;
    const { blocks } = (await res.json()) as { blocks: { startMinutes: number; endMinutes: number }[] };
    // Covers every slot either test actually uses (7:00am-10:00am).
    const busy = blocks.some((block) => block.startMinutes < 600 && block.endMinutes > 420);
    if (!busy) return candidate;
  }
  throw new Error("could not find a free Monday for Bob in the fixture's licensed window after 40 attempts");
}

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function expectTapTargets(page: Page) {
  const tooSmall = await page.evaluate(() => {
    const found: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      "a[href], button, input:not([type=hidden]), select, textarea, [tabindex='0']",
    );
    for (const node of nodes) {
      const target = node instanceof HTMLInputElement && node.type === "checkbox" ? (node.closest("label") ?? node) : node;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || getComputedStyle(target).visibility === "hidden") continue;
      if (rect.width < 44 || rect.height < 44) {
        const name = (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().slice(0, 40);
        found.push(`${node.tagName.toLowerCase()} "${name}" ${String(Math.round(rect.width))}x${String(Math.round(rect.height))}`);
      }
    }
    return found;
  });
  expect(tooSmall).toEqual([]);
}

async function expectReachable(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box).not.toBeNull();
  expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= width).toBe(true);
}

test("AC1: a new job's Contractor card shows Dispatch, opening the dispatch page", async ({ page, request }) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  const reference = await postEnquiry(request, "ac1", "Plumbing", FREMANTLE, MONDAY);
  await putBillingAddress(page, reference);

  await page.goto(`/ops/jobs/${reference}`);
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
  const dispatchLink = page.getByRole("link", { name: "Dispatch", exact: true });
  await expect(dispatchLink).toBeVisible();
  await dispatchLink.click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${reference}/dispatch$`));
  await expect(page.getByRole("heading", { name: `Dispatch ${reference}` })).toBeVisible();
});

test("AC2: a job with no address at all -- Dispatch is off, with the reason", async ({ page, request }) => {
  const reference = await postEnquiry(request, "ac2", "Electrical", JOONDALUP, MONDAY);
  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();

  await expect(page.getByRole("link", { name: "Dispatch", exact: true })).toHaveCount(0);
  await expect(page.getByText("Job site address required before dispatch.")).toBeVisible();
  const disabledButton = page.getByRole("button", { name: "Dispatch", exact: true });
  await expect(disabledButton).toBeVisible();
  await expect(disabledButton).toBeDisabled();
});

test("AC6, AC17, AC18, AC22, AC29, AC34: the whole dispatch flow", async ({ page, request }) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  const monday = await pickFreeMonday(page);
  const saturday = addDays(monday, 5);

  const reference = await postEnquiry(request, "ac6", "Plumbing", FREMANTLE, monday);
  await putBillingAddress(page, reference);

  await page.goto(`/ops/jobs/${reference}/dispatch`);
  await expect(page.getByRole("heading", { name: `Dispatch ${reference}` })).toBeVisible();

  // AC6: opens on the job's preferred date, the window's start, a 1-hour hold.
  await expect(page.getByLabel("Day", { exact: true })).toHaveValue(monday);
  await expect(page.getByLabel("Start (AWST)")).toHaveValue("420"); // 7:00am, morning's start
  await expect(page.getByLabel("Hold")).toHaveValue("60");

  // The price, for a Monday (normal).
  await expect(page.getByText("First hour (includes call-out) $250, then $180/h")).toBeVisible({ timeout: 10_000 });

  // AC17: picking Bob opens his day.
  const bobRow = page.getByRole("button", { name: /Bob Reilly/ });
  await expect(bobRow).toBeVisible();
  await bobRow.click();
  await expect(page.getByRole("heading", { name: /Bob's/ })).toBeVisible();

  // AC18: tapping a half hour moves the start, the hold stays 1 hour.
  await page.getByRole("button", { name: "Start at 9:00am" }).click();
  await expect(page.getByLabel("Start (AWST)")).toHaveValue("540"); // 9:00am
  await expect(page.getByLabel("Hold")).toHaveValue("60");

  // AC22: a Saturday reads the weekend rate.
  await page.getByLabel("Day", { exact: true }).fill(saturday);
  await expect(page.getByText("First hour (includes call-out) $375, then $270/h")).toBeVisible({ timeout: 10_000 });
  // Back to the Monday slot for the actual dispatch.
  await page.getByLabel("Day", { exact: true }).fill(monday);
  await expect(page.getByText("First hour (includes call-out) $250, then $180/h")).toBeVisible({ timeout: 10_000 });

  const goButton = page.getByRole("button", { name: /Dispatch to Bob/ });
  await expect(goButton).toBeEnabled({ timeout: 10_000 });
  await goButton.click();

  // AC29: the job page after dispatch.
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${reference}$`));
  await expect(page.getByText(`${reference} dispatched to Bob. Waiting for his answer.`)).toBeVisible();
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
  await expect(page.getByText("Assigned", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Waiting for Bob's answer - proposed/)).toBeVisible();
  await expect(page.getByText(/Normal.*First hour \(includes call-out\) \$250, then \$180\/h/)).toBeVisible();

  // AC34: the interim texts page carries this dispatch's block. The page is
  // a server read of whatever the dispatcher has already delivered, and the
  // running dev process drains its queue on its own 15-second interval
  // (notifications/dispatcher.ts) -- not the test's clock to control, so
  // this polls with a real reload rather than a single fixed wait.
  await expect
    .poll(
      async () => {
        await page.goto("/dev/texts");
        return page.locator("section", { hasText: reference }).count();
      },
      { timeout: 30_000, intervals: [2_000] },
    )
    .toBeGreaterThan(0);
  const block = page.locator("section", { hasText: reference });
  await expect(block.getByText("CONTRACTOR SMS")).toBeVisible();
  await expect(block.getByRole("heading", { name: new RegExp(reference) })).toBeVisible();
});

test("AC19: a busy contractor still opens his day; a Not ready one does not", async ({ page, request }) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");

  // Busy: dispatch a first job to Bob at 7:00-8:00am, then a second job at the same slot shows him busy.
  const busyDate = await pickFreeMonday(page);
  const first = await postEnquiry(request, "ac19a", "Plumbing", FREMANTLE, busyDate);
  await putBillingAddress(page, first);
  const dispatchRes = await page.request.post(`${apiUrl}/api/jobs/${first}/dispatch`, {
    data: { contractorCode: "CON-014", date: busyDate, startMinutes: 420, holdMinutes: 60, emergency: false },
  });
  expect(dispatchRes.status()).toBe(201);

  const second = await postEnquiry(request, "ac19b", "Plumbing", FREMANTLE, busyDate);
  await putBillingAddress(page, second);
  await page.goto(`/ops/jobs/${second}/dispatch`);
  await expect(page.getByRole("heading", { name: `Dispatch ${second}` })).toBeVisible();
  await expect(page.getByLabel("Start (AWST)")).toHaveValue("420");

  const bobBusyRow = page.getByRole("button", { name: /Bob Reilly/ });
  await expect(bobBusyRow.getByText(/Busy/)).toBeVisible({ timeout: 10_000 });
  await bobBusyRow.click();
  await expect(page.getByRole("heading", { name: /Bob's/ })).toBeVisible();

  // Not ready: Priya (no service area, expired insurance) never opens.
  const third = await postEnquiry(request, "ac19c", "Electrical", JOONDALUP, busyDate);
  await putBillingAddress(page, third);
  await page.goto(`/ops/jobs/${third}/dispatch`);
  await expect(page.getByRole("heading", { name: `Dispatch ${third}` })).toBeVisible();
  const priyaRow = page.getByRole("button", { name: /Priya Nair/ });
  await expect(priyaRow).toBeVisible({ timeout: 10_000 });
  // aria-disabled, not a click that silently no-ops: Playwright itself
  // refuses to click a non-actionable element, which IS the proof -- a Not
  // ready row never becomes clickable in the first place.
  await expect(priyaRow).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("heading", { name: /Priya's/ })).toHaveCount(0);
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC41: at 390px every action on the dispatch page is reachable, no sideways scroll, 44px tap targets", async ({
    page,
    request,
  }) => {
    await page.goto("/ops/jobs");
    await login(page, "mike@idelta.com.au");
    const reference = await postEnquiry(request, "ac41", "Plumbing", FREMANTLE, MONDAY);
    await putBillingAddress(page, reference);

    await page.goto(`/ops/jobs/${reference}/dispatch`);
    await expect(page.getByRole("heading", { name: `Dispatch ${reference}` })).toBeVisible();

    await expectNoSidewaysScroll(page);
    await expectTapTargets(page);
    await expectReachable(page, page.getByLabel("Day", { exact: true }));
    await expectReachable(page, page.getByLabel("Start (AWST)"));
    await expectReachable(page, page.getByLabel("Hold"));
    const bobRow = page.getByRole("button", { name: /Bob Reilly/ });
    await expectReachable(page, bobRow);
    await bobRow.click();
    await expect(page.getByRole("heading", { name: /Bob's/ })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectTapTargets(page);
    await expectReachable(page, page.getByLabel(/Emergency/));
    await expectReachable(page, page.getByRole("button", { name: /Dispatch to Bob/ }));
  });
});
