// Feature 6003 -- the contractor's approve page, frontend e2e (ADR 0001).
//
// AC5  the page shows the Tax Invoice - a line per job with the day and date, T1.5 on the weekend
//      line with its legend, GST on top - Approve shows "Approved - You'll be paid on [pay day]",
//      and opening the link again shows "Already approved"
// AC6  a draft whose contractor's GST registration is not recorded refuses Approve with the
//      office-phone Banner above the button, and stays open
// AC7  a draft replaced by the next Monday's run says so; a link that never existed says it does
//      not work and offers to ring the office
//
// The numbers, the snapshot and the refusals are proven in the backend (tests/settlements-
// approve.test.ts, settlements-supersede.test.ts); the layout rules in tests/settlement-views.test.ts.
// The browser proves the flow at 390px, where a contractor opens it from his email. The approve link
// is minted by the backend's test hook - the real one only exists inside a delivered email. Bob's
// GST answer cannot be emptied, so the refusal in AC6 is the backend's 409, played to the page.
import { test, expect } from "@playwright/test";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { withSettlementsLock } from "./helpers/singleton-lock";
import { approveLinkFor, expectNoSidewaysScroll, finishedJob, mondayRun, runSettlementSweep } from "./helpers/settlements";

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("6003 AC5: the page shows the Tax Invoice with the weekend line marked T1.5; Approve says when he is paid; the link then reads Already approved", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(300_000);
    await withSettlementsLock(async () => {
      const weekday = await finishedJob(browser, request, "apr-weekday");
      const weekend = await finishedJob(browser, request, "apr-weekend", "weekend");
      const [draft] = await runSettlementSweep(request, mondayRun(4));
      if (draft === undefined) throw new Error("the run made no draft");
      const path = await approveLinkFor(request, draft.reference);

      await page.goto(path);
      await expect(page.getByRole("heading", { name: `Tax Invoice ${draft.reference}`, level: 1 })).toBeVisible();
      await expect(page.getByTestId("approve-intro")).toContainText("Check it, then approve. If something is wrong, ring the office on");
      await expect(page.getByTestId("approve-intro")).toContainText("before approving.");
      await expect(page.getByTestId("approve-intro").getByRole("link")).toHaveAttribute("href", /^tel:\d+$/);

      // The invoice: From, To, Period, Date (Draft until it is approved).
      await expect(page.getByTestId("invoice-from")).toContainText("Reilly Plumbing");
      await expect(page.getByTestId("invoice-date")).toContainText("Draft");

      // One line per job with the day and date; the weekend line is T1.5 and the legend explains it once.
      const weekdayLine = page.locator(`[data-testid="pay-line"][data-job="${weekday.job.reference}"]`);
      const weekendLine = page.locator(`[data-testid="pay-line"][data-job="${weekend.job.reference}"]`);
      await expect(weekdayLine).toContainText("Wed 7 Oct");
      await expect(weekdayLine).toContainText("3.0h");
      await expect(weekdayLine).toContainText("$500");
      await expect(weekdayLine.getByTestId("weekend-code")).toHaveCount(0);
      await expect(weekendLine).toContainText("Sat 3 Oct");
      await expect(weekendLine.getByTestId("weekend-code")).toHaveText("T1.5");
      await expect(page.getByTestId("weekend-legend")).toHaveText("T1.5 - weekend, time and a half");

      // Bob is registered: GST is added on top - Subtotal, then GST at a tenth of it - and the Total follows.
      const cents = async (id: string): Promise<number> => {
        const text = (await page.getByTestId(id).locator("td").last().textContent()) ?? "";
        return Math.round(Number(text.replace(/[$,]/g, "")) * 100);
      };
      const subtotal = await cents("subtotal-row");
      const gst = await cents("gst-row");
      const total = await cents("total-row");
      expect(subtotal).toBeGreaterThanOrEqual(80_000);
      expect(gst).toBe(Math.round(subtotal / 10));
      expect(total).toBe(subtotal + gst);

      // A line opens to its working.
      await weekdayLine.getByRole("button", { name: "Working" }).click();
      await expect(page.getByTestId("pay-line-working")).toContainText("2.0h after the first at $150 an hour = $300.");
      await expectNoSidewaysScroll(page);

      // Approve: the Approved Message card, with the way on.
      await page.getByRole("button", { name: "Approve" }).click();
      await expect(page.getByRole("heading", { name: "Approved", level: 1 })).toBeVisible();
      await expect(page.getByText(/^You'll be paid on [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}\.$/)).toBeVisible();
      await expect(page.getByRole("link", { name: "See your settlements" })).toHaveAttribute("href", "/contractor/settlements");

      // The same link, opened again: Already approved.
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Already approved", level: 1 })).toBeVisible();
      await expect(page.getByText(new RegExp(`^You approved ${draft.reference} on \\d{1,2} [A-Z][a-z]{2} \\d{4}\\. You'll be paid on [A-Z][a-z]{2} \\d{1,2} [A-Z][a-z]{2}\\.$`))).toBeVisible();
      await expect(page.getByRole("link", { name: "See your settlements" })).toBeVisible();
    });
  });

  test("6003 AC6: when his GST registration is not recorded, Approve is refused with the office phone above the button and the draft stays open", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(300_000);
    await withSettlementsLock(async () => {
      await finishedJob(browser, request, "apr-gst");
      const [draft] = await runSettlementSweep(request, mondayRun(5));
      if (draft === undefined) throw new Error("the run made no draft");
      const path = await approveLinkFor(request, draft.reference);

      // The backend's refusal for a contractor never asked (proven in tests/settlements-approve.test.ts), played to the page.
      await page.route("**/api/approve/*", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "gst_not_recorded", state: "gst_not_recorded", officePhone: "08 6000 0000" }) });
      });
      await page.goto(path);
      await expect(page.getByRole("heading", { name: new RegExp(`${draft.reference}$`), level: 1 })).toBeVisible();
      await page.getByRole("button", { name: "Approve" }).click();

      const banner = page.getByTestId("gst-banner");
      await expect(banner).toContainText("Your GST registration needs recording first. Ring the office on 08 6000 0000.");
      await expect(banner.getByRole("link", { name: "08 6000 0000" })).toHaveAttribute("href", "tel:0860000000");
      // It sits right above the button, and the page is still the open draft.
      const bannerBox = await banner.boundingBox();
      const buttonBox = await page.getByRole("button", { name: "Approve" }).boundingBox();
      expect((bannerBox?.y ?? 0) + (bannerBox?.height ?? 0)).toBeLessThanOrEqual(buttonBox?.y ?? 0);
      await expect(page.getByRole("button", { name: "Approve" })).toBeEnabled();
      await expect(page.getByRole("heading", { name: "Approved" })).toHaveCount(0);
    });
  });

  test("6003 AC7: a draft replaced by the next run says it was replaced; a link that never existed says it does not work", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(300_000);
    await withSettlementsLock(async () => {
      await finishedJob(browser, request, "apr-first");
      const [first] = await runSettlementSweep(request, mondayRun(6));
      if (first === undefined) throw new Error("the run made no draft");
      const staleLink = await approveLinkFor(request, first.reference);
      // Ignored for a week; more work; the next Monday's run replaces it with ONE fresh draft.
      await finishedJob(browser, request, "apr-second");
      const [second] = await runSettlementSweep(request, mondayRun(7));
      expect(second?.replacedId).not.toBeNull();
      expect(second?.reference).not.toBe(first.reference);

      await page.goto(staleLink);
      await expect(page.getByRole("heading", { name: "This invoice was replaced", level: 1 })).toBeVisible();
      await expect(page.getByText("This invoice was replaced by a newer one. Use the link in your latest email.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);

      // The fresh draft's link works.
      await page.goto(await approveLinkFor(request, second?.reference ?? ""));
      await expect(page.getByRole("heading", { name: new RegExp(`${second?.reference ?? ""}$`), level: 1 })).toBeVisible();

      // A link that never existed.
      await page.goto("/approve/not-a-real-link");
      await expect(page.getByRole("heading", { name: "This link doesn't work", level: 1 })).toBeVisible();
      await expect(page.getByText("Use the link in your latest email, or ring the office.")).toBeVisible();
      await expect(page.getByRole("link", { name: /^Ring the office - / })).toHaveAttribute("href", /^tel:\d+$/);
      await expectNoSidewaysScroll(page);
    });
  });
});
