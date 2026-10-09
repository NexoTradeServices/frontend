// Feature 6003 -- settlement run: what the invoice and the dead links show (unit, Vitest).
//
// AC3  Bob's Tax Invoice: Subtotal $1,075, GST $107.50, materials $45 in their own block, Total
//      $1,227.50; Dave's plain Invoice has no Subtotal or GST line
// AC5  one pay line per job with the day and date, "T1.5" on the weekend line and the legend under
//      the table; the materials block apart
// AC7  the three dead approve links name why and carry their one fix
//
// The screens render on the server from the data the backend sends, so they are proven here with
// exactly that data (the backend's tests prove the data: settlements-sweep.test.ts,
// settlements-approve.test.ts); the browser specs prove what needs a browser.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { InvoiceCard } from "../src/components/settlements/invoice-card";
import { DeadApproveCard } from "../src/components/settlements/approve-cards";
import { formatPay, hoursText } from "../src/components/settlements/money";
import { fileNameFrom } from "../src/lib/download";
import type { InvoiceView } from "../src/components/settlements/types";

const visit = { kind: "visit", calloutRate: 20_000, extraHours: 2, standardRate: 15_000, extraTotal: 30_000, multiplier: 1 } as const;

const BOBS: InvoiceView = {
  reference: "CINV-518",
  status: "draft",
  heading: "Tax Invoice",
  gstRegistered: true,
  gstNotRecorded: false,
  from: { name: "Bob Reilly", businessName: "Reilly Plumbing", abn: "51000000680" },
  to: { name: "Trade Services", abn: null, address: null },
  period: { start: "2026-10-12", end: "2026-10-18", label: "12 Oct - 18 Oct 2026" },
  dateLabel: "Draft",
  weekendMultiplier: 1.5,
  lines: [
    { jobReference: "JOB-1043", day: "Wed 14 Oct", trade: "Plumbing", hours: 3, weekend: false, amount: 50_000, working: visit },
    { jobReference: "JOB-1044", day: "Thu 15 Oct", trade: "Plumbing", hours: 1.5, weekend: false, amount: 27_500, working: { ...visit, extraHours: 0.5, extraTotal: 7500 } },
    { jobReference: "JOB-1045", day: "Sat 17 Oct", trade: "Plumbing", hours: 1, weekend: true, amount: 30_000, working: { ...visit, calloutRate: 30_000, extraHours: 0, extraTotal: 0, multiplier: 1.5 } },
  ],
  adjustments: [],
  subtotal: 107_500,
  gst: 10_750,
  materials: [{ jobReference: "JOB-1043", name: "Caroma cartridge", amount: 4500 }],
  materialsTotal: 4500,
  total: 122_750,
};

const DAVES: InvoiceView = {
  ...BOBS,
  reference: "CINV-519",
  heading: "Invoice",
  gstRegistered: false,
  from: { name: "Dave Hurst", businessName: "Hurst Electrical & Air", abn: "51000000761" },
  lines: [{ jobReference: "JOB-1046", day: "Tue 13 Oct", trade: "Electrical", hours: 2, weekend: false, amount: 36_500, working: visit }],
  subtotal: 36_500,
  gst: null,
  materials: [],
  materialsTotal: 0,
  total: 36_500,
};

const render = (invoice: InvoiceView): string => renderToStaticMarkup(createElement(InvoiceCard, { invoice }));

describe("money and hours", () => {
  test("whole dollars plain, cents when there are cents, a comma past a thousand", () => {
    expect(formatPay(20_000)).toBe("$200");
    expect(formatPay(10_750)).toBe("$107.50");
    expect(formatPay(107_500)).toBe("$1,075");
    expect(formatPay(122_750)).toBe("$1,227.50");
    expect(formatPay(0)).toBe("$0");
  });

  test("hours read 3.0h, 1.5h, 0.25h", () => {
    expect(hoursText(3)).toBe("3.0h");
    expect(hoursText(1.5)).toBe("1.5h");
    expect(hoursText(0.25)).toBe("0.25h");
  });

  test("the CSV's file name comes from the API's header, else the fallback", () => {
    expect(fileNameFrom('attachment; filename="payout-run-2026-10-21.csv"', "x.csv")).toBe("payout-run-2026-10-21.csv");
    expect(fileNameFrom(null, "payout-run.csv")).toBe("payout-run.csv");
  });
});

describe("AC3/AC5 -- Bob's Tax Invoice", () => {
  const html = render(BOBS);

  test("a line per job with the day and date, trade, hours and amount", () => {
    for (const text of ["JOB-1043", "Wed 14 Oct", "3.0h", "$500", "Thu 15 Oct", "1.5h", "$275", "Sat 17 Oct", "1.0h", "$300"]) {
      expect(html).toContain(text);
    }
    expect(html.match(/data-testid="pay-line"/g)).toHaveLength(3);
  });

  test("the weekend line carries T1.5 after its hours, and one legend explains it", () => {
    expect(html.match(/data-testid="weekend-code"/g)).toHaveLength(1);
    expect(html).toContain("T1.5 - weekend, time and a half");
    expect(html.match(/data-testid="weekend-legend"/g)).toHaveLength(1);
  });

  test("GST goes on top: Subtotal $1,075, GST $107.50, then the materials block apart, then Total $1,227.50", () => {
    expect(html).toContain("Subtotal");
    expect(html).toContain("$1,075");
    expect(html).toContain("$107.50");
    expect(html).toContain("Materials reimbursement - per receipts, not subject to GST");
    expect(html).toContain("Caroma cartridge");
    expect(html).toContain("$1,227.50");
    // Order: subtotal, GST, materials, total.
    const order = ["subtotal-row", "gst-row", "materials-heading", "materials-line", "total-row"].map((id) => html.indexOf(`data-testid="${id}"`));
    expect(order.every((position) => position > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("From and To read as the invoice's parties, and the date is Draft until approved", () => {
    expect(html).toContain("Reilly Plumbing");
    expect(html).toContain("ABN 51000000680");
    expect(html).toContain("Trade Services");
    expect(html).toContain("12 Oct - 18 Oct 2026");
    expect(html).toContain("Draft");
  });
});

describe("AC3 -- Dave's plain Invoice", () => {
  const html = render(DAVES);

  test("no Subtotal, no GST line, no materials block, no legend - just the lines and the Total", () => {
    expect(html).not.toContain('data-testid="subtotal-row"');
    expect(html).not.toContain('data-testid="gst-row"');
    expect(html).not.toContain("Materials reimbursement");
    expect(html).not.toContain("weekend-legend");
    expect(html).toContain("$365");
    expect(html).toContain('data-testid="total-row"');
  });
});

describe("pay adjustments", () => {
  test("follow the job lines as their own lines, the reason as the description", () => {
    const html = render({ ...BOBS, adjustments: [{ reason: "Missing hour, corrected after approval", amount: 15_000, jobReference: "JOB-1043" }] });
    expect(html).toContain('data-testid="adjustment-line"');
    expect(html).toContain("Missing hour, corrected after approval");
    expect(html.indexOf("adjustment-line")).toBeGreaterThan(html.lastIndexOf('data-testid="pay-line"'));
  });
});

describe("AC7 -- a dead approve link names why and carries its one fix", () => {
  const card = (dead: Parameters<typeof DeadApproveCard>[0]["dead"]): string => renderToStaticMarkup(createElement(DeadApproveCard, { dead }));

  test("replaced", () => {
    const html = card({ state: "replaced", officePhone: "08 6000 0000" });
    expect(html).toContain("This invoice was replaced");
    expect(html).toContain("This invoice was replaced by a newer one. Use the link in your latest email.");
  });

  test("already approved, with the date and the pay day, and the way on", () => {
    const html = card({ state: "approved", reference: "CINV-518", approvedLabel: "20 Oct 2026", payDay: "Wed 21 Oct", paid: false, officePhone: "08 6000 0000" });
    expect(html).toContain("Already approved");
    expect(html).toContain("You approved CINV-518 on 20 Oct 2026.");
    expect(html).toContain("You&#x27;ll be paid on Wed 21 Oct.");
    expect(html).toContain('href="/contractor/settlements"');
    expect(html).toContain("See your settlements");
  });

  test("already approved and paid says so instead of promising a pay day", () => {
    const html = card({ state: "approved", reference: "CINV-518", approvedLabel: "20 Oct 2026", payDay: "Wed 21 Oct", paid: true, officePhone: "08 6000 0000" });
    expect(html).toContain("It has been paid.");
    expect(html).not.toContain("be paid on");
  });

  test("unknown rings the office", () => {
    const html = card({ state: "unknown", officePhone: "08 6000 0000" });
    expect(html).toContain("This link doesn&#x27;t work");
    expect(html).toContain("Use the link in your latest email, or ring the office.");
    expect(html).toContain('href="tel:0860000000"');
    expect(html).toContain("Ring the office - 08 6000 0000");
  });
});
