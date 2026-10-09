// Settlement helpers for the browser tests -- Feature 6003, settlement run.
//
// A draft invoice only exists once the Monday run has swept a contractor's finished work, and the
// approve link only exists inside a delivered email. The tests reach both through the backend's
// non-production hooks (backend/src/test-data/routes.ts): the run as of a chosen Monday -- with the
// test-run cookie it sweeps only `e2e` work, so the owner's UAT records are never touched -- and a
// fresh approve link for a settlement labelled as test data.
import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob } from "./accepted-job";
import type { DispatchedJob } from "./dispatched-job";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** Perth keeps no daylight saving: its clock is always UTC+8. */
const PERTH_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 6:30am Perth on a Monday after today, `weeksAhead` weeks further on, as an ISO time. The run due
 * then covers the week ending the Sunday before, so every job finished today is in its period.
 * Each test picks its own `weeksAhead`, so one test's settlement never blocks another's run.
 */
export function mondayRun(weeksAhead = 0): string {
  const perthNow = new Date(Date.now() + PERTH_OFFSET_MS);
  const untilMonday = ((8 - perthNow.getUTCDay()) % 7) || 7;
  const monday = Date.UTC(perthNow.getUTCFullYear(), perthNow.getUTCMonth(), perthNow.getUTCDate() + untilMonday + 7 * weeksAhead, 6, 30);
  return new Date(monday - PERTH_OFFSET_MS).toISOString();
}

export interface MadeDraft {
  reference: string;
  contractorId: string;
  replacedId: string | null;
}

/** Runs the Monday run as of `now`; returns the drafts it made. */
export async function runSettlementSweep(request: APIRequestContext, now: string): Promise<MadeDraft[]> {
  const res = await request.post(`${apiUrl}/api/test-data/settlements/run`, { data: { now } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { made: MadeDraft[] }).made;
}

/** The path (`/approve/<token>`) of a fresh approve link for a settlement labelled as test data. */
export async function approveLinkFor(request: APIRequestContext, reference: string): Promise<string> {
  const res = await request.post(`${apiUrl}/api/test-data/settlements/${reference}/approve-link`);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { path: string }).path;
}

/** Bob taps Approve on a link, without a browser. */
export async function approveByLink(request: APIRequestContext, path: string): Promise<void> {
  const res = await request.post(`${apiUrl}/api${path}`, { data: {} });
  expect(res.status()).toBe(200);
}

export interface FinishedJob {
  job: DispatchedJob;
  /** the day Bob worked, YYYY-MM-DD */
  date: string;
}

/**
 * A job Bob has finished through the API. A weekday job is Wed 7 Oct, 3.0h ($500); a weekend one
 * is Sat 3 Oct, 1.0h at time and a half ($300).
 */
export async function finishedJob(
  browser: Browser,
  request: APIRequestContext,
  tag: string,
  kind: "weekday" | "weekend" = "weekday",
): Promise<FinishedJob> {
  const job = await acceptedJobForBob(browser, request, tag);
  const visit = kind === "weekend" ? { date: "2026-10-03", start: "08:00", end: "09:00" } : { date: "2026-10-07", start: "08:07", end: "11:05" };
  await completeJobAsBob(browser, job, visit);
  return { job, date: visit.date };
}

/** The page never scrolls sideways. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}
