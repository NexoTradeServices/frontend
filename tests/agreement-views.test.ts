// Feature 2006 -- contractor agreement: what the server-rendered screens show for each state (unit, Vitest).
//
// AC7   the dashboard's readiness panel links the agreement row to /contractor/agreement
// AC14  the ops record's Contractor agreement card: accepted (date, version, record link),
//       not yet accepted (warning tag, caption, no accept control), nothing published
//
// The dashboard and the ops record are rendered on the server from the real
// backend's data, and the shared dev database must never be left with a
// published agreement (it would hold Bob out of every other spec), so these
// two screens are proven here by rendering them with the exact data the
// backend sends -- the backend's own tests prove the data
// (backend/tests/contractor-dashboard.test.ts, contractors.test.ts).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ReadinessPanel } from "../src/components/contractor-dashboard/readiness-panel";
import { ContractorAgreementCard } from "../src/components/contractors/agreement-card";

describe("AC7 -- the readiness row links to the agreement page", () => {
  test("the agreement item reads as his own, with a Fix now link to /contractor/agreement, under the Not ready tag", () => {
    const html = renderToStaticMarkup(
      createElement(ReadinessPanel, {
        ready: false,
        missing: [
          {
            key: "agreement",
            copy: "contractor agreement (not accepted)",
            pen: "own",
            route: "/contractor/agreement",
            blocking: true,
          },
        ],
      }),
    );
    expect(html).toContain("Not ready to dispatch");
    expect(html).toContain("contractor agreement (not accepted)");
    expect(html).toContain('href="/contractor/agreement"');
    expect(html).toContain("Fix now");
  });
});

describe("AC14 -- the ops record's agreement card", () => {
  const card = (agreement: Parameters<typeof ContractorAgreementCard>[0]["agreement"]): string =>
    renderToStaticMarkup(createElement(ContractorAgreementCard, { code: "CON-014", agreement }));

  test("accepted: the Accepted fact and the record link; no accept control", () => {
    const html = card({
      state: "accepted",
      currentVersion: "2",
      acceptedVersion: "2",
      acceptedAt: "2026-09-09T04:00:00.000Z",
      recordAvailable: true,
    });
    expect(html).toContain("Accepted");
    expect(html).toMatch(/09\/09\/26, version 2/);
    expect(html).toContain("Acceptance record (PDF)");
    expect(html).not.toMatch(/>Accept</);
  });

  test("not yet accepted: the warning tag and the caption, no accept control, no record link", () => {
    const html = card({
      state: "not_accepted",
      currentVersion: "2",
      acceptedVersion: null,
      acceptedAt: null,
      recordAvailable: false,
    });
    expect(html).toContain("Not yet accepted");
    expect(html).toContain("Version 2 is current. Only the contractor can accept it.");
    expect(html).not.toContain("Acceptance record");
    expect(html).not.toContain("<button");
  });

  test("nothing published: the one muted line", () => {
    const html = card({ state: "none_published", currentVersion: null, acceptedVersion: null, acceptedAt: null, recordAvailable: false });
    expect(html).toContain("No agreement published yet.");
    expect(html).not.toContain("<button");
  });
});
