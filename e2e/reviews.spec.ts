// Feature 6009 -- the customer's review page, frontend e2e (ADR 0001).
//
// AC3  tapping a star in the email opens /review/<token> with that star already chosen, the title
//      "How did Bob go?" and the line "Plumbing - JOB-xxxx - [date]"
// AC4  Send with no star shows "Choose a star." and sends nothing; with a star (comment and score
//      optional) it shows "Thank you" / "Your review has been sent."; the score box clears when tapped
//      again; the same link then reads "Already rated"
// AC5  a used link reads "Already rated" / "Thanks, we have your review for JOB-xxxx."; a link past
//      its 30 days reads "This link has expired" with the office phone; a link that never existed
//      says it does not work
//
// The saving, the single use, the 30 days and the averages are proven in the backend
// (tests/reviews.test.ts). The browser proves the flow at 390px, where a customer opens it from her
// email. The review link is minted by the backend's test hook - the real one only exists inside a
// delivered email.
import { test, expect } from "@playwright/test";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { acceptedJobForBob, completeJobAsBob } from "./helpers/accepted-job";
import { reviewLinkFor } from "./helpers/reviews";
import { expectNoSidewaysScroll } from "./helpers/settlements";

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("6009 AC3: a star in the email opens the page with it chosen, Bob's name and the job line", async ({ page, browser, request }) => {
    test.setTimeout(180_000);
    const job = await acceptedJobForBob(browser, request, "rev-star");
    await completeJobAsBob(browser, job);
    const path = await reviewLinkFor(request, job.reference);

    await page.goto(`${path}?rating=4`);
    const title = page.getByRole("heading", { name: "How did Bob go?", level: 1 });
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS("font-size", "20px");
    await expect(title).toHaveCSS("font-weight", "800");
    await expect(page.getByTestId("review-intro")).toHaveText(new RegExp(`^Plumbing - ${job.reference} - \\d{1,2} [A-Z][a-z]{2} \\d{4}$`));
    await expect(page.getByTestId("stars-choose")).toHaveAttribute("data-value", "4");
    await expect(page.getByRole("radio", { name: "4 stars" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "5 stars" })).toHaveAttribute("aria-checked", "false");
    // The Medium container for the open page, no sideways scroll, every tap target 44px.
    await expect(page.locator('[data-container="medium"]')).toBeVisible();
    await expectNoSidewaysScroll(page);
    for (const star of await page.getByRole("radio").all()) {
      const box = await star.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    // A star out of range, or none, opens the page with nothing chosen.
    await page.goto(`${path}?rating=9`);
    await expect(page.getByTestId("stars-choose")).toHaveAttribute("data-value", "0");
  });

  test("6009 AC4: no star shows 'Choose a star.'; a star, a comment and a score send; the link then says Already rated", async ({ page, browser, request }) => {
    test.setTimeout(180_000);
    const job = await acceptedJobForBob(browser, request, "rev-send");
    await completeJobAsBob(browser, job);
    const path = await reviewLinkFor(request, job.reference);

    await page.goto(path);
    await expect(page.getByTestId("stars-choose")).toHaveAttribute("data-value", "0");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Choose a star.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thank you" })).toHaveCount(0);

    await page.getByRole("radio", { name: "2 stars" }).click();
    await expect(page.getByText("Choose a star.")).toHaveCount(0);
    await page.getByLabel("Anything to add?").fill("Tidy work.");
    // The Score row: eleven boxes, tapping the chosen one again clears it.
    const score = page.getByTestId("score-row");
    await expect(score.getByRole("button")).toHaveCount(11);
    await score.getByRole("button", { name: "9", exact: true }).click();
    await expect(score).toHaveAttribute("data-value", "9");
    await score.getByRole("button", { name: "9", exact: true }).click();
    await expect(score).toHaveAttribute("data-value", "");
    await score.getByRole("button", { name: "9", exact: true }).click();
    await expect(score).toHaveAttribute("data-value", "9");
    await expectNoSidewaysScroll(page);

    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("heading", { name: "Thank you", level: 1 })).toBeVisible();
    await expect(page.getByText("Your review has been sent.")).toBeVisible();
    await expect(page.locator('[data-container="medium"]').getByTestId("message-card")).toBeVisible();

    // The link is used up.
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Already rated", level: 1 })).toBeVisible();
    await expect(page.getByText(`Thanks, we have your review for ${job.reference}.`)).toBeVisible();
  });

  test("6009 AC5: a used link reads Already rated; an expired one reads This link has expired with the office phone; an unknown one does not work", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const job = await acceptedJobForBob(browser, request, "rev-dead");
    await completeJobAsBob(browser, job);

    await page.goto(await reviewLinkFor(request, job.reference, "used"));
    await expect(page.getByRole("heading", { name: "Already rated", level: 1 })).toBeVisible();
    await expect(page.getByText(`Thanks, we have your review for ${job.reference}.`)).toBeVisible();
    await expect(page.locator('[data-container="narrow"]').getByTestId("message-card")).toBeVisible();

    await page.goto(await reviewLinkFor(request, job.reference, "expired"));
    await expect(page.getByRole("heading", { name: "This link has expired", level: 1 })).toBeVisible();
    await expect(page.getByText(/^Call us on .+ if you would like to leave a review\.$/)).toBeVisible();
    await expect(page.getByRole("link", { name: /^Ring the office - / })).toHaveAttribute("href", /^tel:\d+$/);

    await page.goto("/review/not-a-real-link");
    await expect(page.getByRole("heading", { name: "This link doesn't work", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Ring the office - / })).toBeVisible();
  });
});
