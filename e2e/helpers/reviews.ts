// Review helpers for the browser tests -- Feature 6009, ratings and reviews.
//
// The real review link only exists inside a delivered email, which a browser test cannot read. The
// backend's non-production hook (backend/src/test-data/routes.ts) mints a fresh link for a completed
// job labelled as test data, open, used or expired.
import { expect, type APIRequestContext } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** The path (`/review/<token>`) of a fresh review link for a job labelled as test data. */
export async function reviewLinkFor(
  request: APIRequestContext,
  reference: string,
  state: "open" | "used" | "expired" = "open",
): Promise<string> {
  const res = await request.post(`${apiUrl}/api/test-data/jobs/${reference}/review-link`, { data: { state } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { path: string }).path;
}

/** The customer rates a job through the link, without a browser. */
export async function rateByLink(
  request: APIRequestContext,
  path: string,
  review: { rating: number; reviewText?: string; recommendScore?: number },
): Promise<void> {
  const res = await request.post(`${apiUrl}/api${path}`, { data: review });
  expect(res.status()).toBe(200);
}
