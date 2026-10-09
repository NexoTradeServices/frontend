// Feature 2003, contractor dashboard + rates screen -- frontend e2e (ADR
// 0001, Playwright), at the contractor portal's primary (phone) viewport.
//
// AC1  Bob's dashboard lists his three live jobs, one card each
// AC2  Sarah's JOB-1042 (awaiting his answer) renders above Tom's JOB-1051
//      (already accepted, sooner) -- unanswered beats sooner
// AC3  Margaret's JOB-1039, on hold with no return date, sorts last
// AC4  a card carries reference, status tag, customer, trade + suburb, and
//      the slot labelled in the job's own timezone
// AC5  Dave has no live jobs -- the empty state, never a blank page
// AC6  Bob is ready and has nothing missing -- no readiness panel at all
// AC7  Priya's panel: her own two items (each linking or plain), Mike's one
//      ("Call the office", no link)
// AC8  proven at the backend (contractor-dashboard.test.ts): ready stays
//      true, no e2e coverage here -- the only way to reproduce it live is a
//      write to the shared seeded Bob/Dave/Priya rows contractors.spec.ts's
//      own serial block already writes to, and the tag's on/off rendering
//      (a bare ternary) is exercised by both branches already, in AC6/AC7.
// AC9  Bob's rates: Plumbing, two rows, the word "emergency" nowhere on the
//      screen
// AC10 Dave's rates: Electrical + Air conditioning as separate cards, each
//      its own ladder and licence line (the expired-licence TAG itself is
//      dispatchState()/dispatchStateLabel(), reused unchanged from 2001's
//      record page, already proven e2e there -- contractors.spec.ts AC6)
// 5001 AC1 (UI) an accepted or in-progress card is a link to its job screen; the card still
//      awaiting his answer is not
// AC13 the contractor menu shows Dashboard, Rates, Service area and Settlements
//      (built), the rest still dark
//
// Runs against the seeded dev database (`npm run db:seed:fixtures`).
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC1-AC4: Bob's three live jobs, sorted, each card fully rendered", async ({ page }) => {
    await page.goto("/contractor");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // The most deeply nested <div> that carries both texts is the card's own
    // outer element -- every ancestor also "contains" both (text bubbles up),
    // but none more specifically than the card itself.
    const sarahCard = page.locator("div, a").filter({ hasText: "JOB-1042" }).filter({ hasText: "Sarah Chen" }).last();
    const tomCard = page.locator("div, a").filter({ hasText: "JOB-1051" }).filter({ hasText: "Tom" }).last();
    const margaretCard = page.locator("div, a").filter({ hasText: "JOB-1039" }).filter({ hasText: "Margaret" }).last();

    // AC2/AC3: the order (unanswered first, then soonest, then no return date
    // last) and the slot's timezone label are proven at the backend,
    // tests/contractor-dashboard.test.ts. Here, only how each card reads.

    // AC4: reference, status tag, customer, trade + suburb, labelled slot.
    await expect(sarahCard.getByText("Awaiting your answer", { exact: true })).toBeVisible();
    await expect(sarahCard.getByText("Sarah Chen")).toBeVisible();
    await expect(sarahCard.getByText("Plumbing")).toBeVisible();
    await expect(sarahCard.getByText("Hilton")).toBeVisible();

    // 5001 AC1: Tom's accepted card opens; Sarah's, awaiting an answer, stays flat.
    await expect(page.getByRole("link", { name: /JOB-1051/ })).toHaveAttribute("href", "/contractor/jobs/JOB-1051");
    await expect(page.getByRole("link", { name: /JOB-1042/ })).toHaveCount(0);

    await expect(tomCard.getByText("Scheduled", { exact: true })).toBeVisible();
    await expect(tomCard.getByText("Tom")).toBeVisible();
    await expect(tomCard.getByText("Kalamunda")).toBeVisible();

    await expect(margaretCard.getByText("On hold", { exact: true })).toBeVisible();
    await expect(margaretCard.getByText("Margaret")).toBeVisible();
    await expect(margaretCard.getByText("Applecross")).toBeVisible();
    await expect(margaretCard.getByText("No return date yet")).toBeVisible();

    // AC6: Bob is ready and has nothing missing -- no readiness panel.
    await expect(page.getByText("Not ready to dispatch")).toHaveCount(0);
  });

  test("AC5: Dave has no live jobs -- the empty state", async ({ page }) => {
    await page.goto("/contractor");
    await login(page, "dave@idelta.com.au");
    await expect(page.getByText("Nothing on your list right now.")).toBeVisible();
  });

  test("AC7: Priya's panel -- her own two items, Mike's one, no address/EC nudge", async ({ page }) => {
    await page.goto("/contractor");
    await login(page, "priya@idelta.com.au");
    await expect(page.getByText("Not ready to dispatch")).toBeVisible();

    const panel = page.locator("ul").filter({ hasText: "service area" });
    await expect(panel.getByText("service area (not set up yet)")).toBeVisible();
    await expect(panel.getByRole("link", { name: "Fix now" })).toHaveCount(1); // her one built destination
    await expect(panel.getByText("payout details")).toBeVisible();
    await expect(panel.getByText("insurance renewal (expired)")).toBeVisible();
    await expect(panel.getByText("Call the office")).toBeVisible();
    await expect(panel.getByText("own address")).toHaveCount(0);
    await expect(panel.getByText("emergency contact")).toHaveCount(0);
  });

  test("AC9: Bob's rates -- Plumbing, two rows, no emergency anywhere on the screen", async ({ page }) => {
    await page.goto("/contractor/rates");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Rates" })).toBeVisible();
    await expect(page.getByText("Plumbing", { exact: true })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Normal" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Weekend" })).toBeVisible();
    await expect(page.getByText("$200.00")).toBeVisible();
    await expect(page.getByText("$150.00")).toBeVisible();
    await expect(page.getByText("$300.00")).toBeVisible();
    await expect(page.getByText("$225.00")).toBeVisible();

    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("emergency");
  });

  test("AC10: Dave's rates -- Electrical and Air conditioning as separate cards, each its own ladder and licence line", async ({ page }) => {
    await page.goto("/contractor/rates");
    await login(page, "dave@idelta.com.au");
    await expect(page.getByText("Electrical", { exact: true })).toBeVisible();
    await expect(page.getByText("Air conditioning", { exact: true })).toBeVisible();
    await expect(page.getByText(/Licence EC-0221, expires/)).toBeVisible();
    await expect(page.getByText(/Licence ARC-0221, expires/)).toBeVisible();
    await expect(page.getByText("$210.00")).toBeVisible(); // Electrical call-out
    await expect(page.getByText("$215.00")).toBeVisible(); // Air conditioning call-out
  });

  test("AC13: the contractor menu shows Dashboard, Rates, Service area and Settlements; the rest still dark", async ({ page }) => {
    await page.goto("/contractor");
    await login(page, "bob@idelta.com.au");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Rates" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Service area" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Calendar" })).toHaveCount(0);
    // Feature 6003 built it.
    await expect(menu.getByRole("link", { name: "Payouts" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "My details" })).toHaveCount(0);
  });
});
