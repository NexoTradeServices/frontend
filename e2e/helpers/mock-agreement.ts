// Stands in for the backend's agreement answers in the browser -- Feature 2006.
//
// The shared dev database must never be left with a published agreement (it
// would hold Bob out of every other spec's dispatch), and no test touches the
// real Cloudinary account. So the browser's own calls about the agreement
// are answered here, by route interception, the way mock-cloudinary.ts fakes
// 3003's: the owner's list and publish, the file addresses, and Bob's read
// and accept. Server-rendered pages cannot be intercepted this way; those
// are proven in tests/agreement-views.test.ts.
import type { BrowserContext, Page, Route } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

function cors(route: Route): Record<string, string> {
  const origin = route.request().headers()["origin"] ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin",
  };
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, headers: cors(route), contentType: "application/json", body: JSON.stringify(body) });
}

/** A fake file address the opened tab can land on. Answered as a page, not a PDF: headless Chromium turns a PDF navigation into a download. */
export async function installMockFileHost(context: BrowserContext): Promise<void> {
  await context.route("https://files.test/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<p>the agreement file</p>" }),
  );
}

// ---------------------------------------------------------------------------
// The owner's side: list and publish
// ---------------------------------------------------------------------------

export interface MockedVersion {
  id: string;
  version: string;
  issuedAt: string;
  issuedBy: string;
  current: boolean;
}

export interface OwnerAgreementMock {
  versions: MockedVersion[];
  activeContractors: number;
  /** what the next publish answers: ok, or this refusal */
  nextRefusal: { status: number; error: string; field: string } | null;
  /** every publish that reached "the backend" */
  publishes: { label: string; bytes: number; contentType: string }[];
  /** every file address asked for */
  opened: string[];
}

export async function installMockOwnerAgreements(page: Page, seed: Partial<OwnerAgreementMock> = {}): Promise<OwnerAgreementMock> {
  const mock: OwnerAgreementMock = {
    versions: [],
    activeContractors: 3,
    nextRefusal: null,
    publishes: [],
    opened: [],
    ...seed,
  };

  await page.route(new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/agreements(/.*|\\?.*)?$`), async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors(route) });
      return;
    }
    const url = new URL(request.url());
    const fileMatch = /^\/api\/agreements\/([^/]+)\/file$/.exec(url.pathname);
    if (request.method() === "GET" && fileMatch) {
      mock.opened.push(fileMatch[1] ?? "");
      await json(route, 200, { url: `https://files.test/agreements/${fileMatch[1] ?? ""}.pdf`, expiresAt: new Date(Date.now() + 120_000).toISOString() });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/agreements") {
      await json(route, 200, { activeContractors: mock.activeContractors, versions: mock.versions });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/agreements") {
      const label = url.searchParams.get("label") ?? "";
      mock.publishes.push({
        label,
        bytes: request.postDataBuffer()?.length ?? 0,
        contentType: request.headers()["content-type"] ?? "",
      });
      if (mock.nextRefusal) {
        const { status, error, field } = mock.nextRefusal;
        mock.nextRefusal = null;
        await json(route, status, { error, field });
        return;
      }
      mock.versions = [
        { id: `mock-${label}`, version: label, issuedAt: new Date().toISOString(), issuedBy: "The owner", current: true },
        ...mock.versions.map((v) => ({ ...v, current: false })),
      ];
      await json(route, 201, { id: `mock-${label}`, version: label });
      return;
    }
    await route.fallback();
  });

  return mock;
}

// ---------------------------------------------------------------------------
// Bob's side: read, accept, open
// ---------------------------------------------------------------------------

export interface ContractorAgreementMock {
  accepted: boolean;
  /** every accept that reached "the backend" */
  accepts: string[];
  /** every file address asked for */
  opened: string[];
}

export async function installMockContractorAgreement(page: Page, version = "1"): Promise<ContractorAgreementMock> {
  const mock: ContractorAgreementMock = { accepted: false, accepts: [], opened: [] };
  const issuedAt = "2026-09-01T02:00:00.000Z";
  const acceptedAt = "2026-09-09T04:00:00.000Z";

  await page.route(new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/(contractor/agreement.*|agreements/.*)$`), async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors(route) });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path === "/api/contractor/agreement") {
      await json(route, 200, {
        published: true,
        version: { id: `mock-${version}`, label: version, issuedAt },
        accepted: mock.accepted,
        acceptedAt: mock.accepted ? acceptedAt : null,
        timezone: "Australia/Perth",
        contractorCode: "CON-014",
      });
      return;
    }
    if (request.method() === "POST" && path === "/api/contractor/agreement/accept") {
      const body = request.postDataJSON() as { versionId: string };
      mock.accepts.push(body.versionId);
      mock.accepted = true;
      await json(route, 201, { accepted: true, version });
      return;
    }
    if (request.method() === "GET" && /^\/api\/agreements\/.+/.test(path)) {
      mock.opened.push(path);
      await json(route, 200, { url: `https://files.test${path}.pdf`, expiresAt: new Date(Date.now() + 120_000).toISOString() });
      return;
    }
    await route.fallback();
  });

  return mock;
}
