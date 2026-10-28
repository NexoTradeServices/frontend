// Service status -- Feature 6012. `/ops/status`, ops + owner. Portal shell, Wide container,
// List page without the Search bar, Filter row or paging (Pages / Which layout each kind of page
// takes: "A fixed handful of rows ... (service status)").
//
// Opening the page checks every outside service live: the five the backend can reach come from
// GET /api/status, Google Places is checked here in the browser with its own key. "Check again"
// runs all six again and stays disabled until every one has answered. Nothing is recorded.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/auth/buttons";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { checkPlaces } from "@/lib/places-check";
import type { BackendServiceStatus, RowState, StatusRow } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The design's order, with Google Places fourth. */
const ROWS: Pick<StatusRow, "key" | "name" | "purpose">[] = [
  { key: "mailjet", name: "Mailjet", purpose: "email" },
  { key: "clicksend", name: "ClickSend", purpose: "texts" },
  { key: "stripe", name: "Stripe", purpose: "payments" },
  { key: "places", name: "Google Places", purpose: "address lookup" },
  { key: "recaptcha", name: "reCAPTCHA", purpose: "bot check" },
  { key: "cloudinary", name: "Cloudinary", purpose: "photos" },
];

const SERVER_UNREACHED = "Could not reach the platform's own server";

const checking = (): StatusRow[] => ROWS.map((row) => ({ ...row, state: "checking" as const }));

function StatusCell({ row }: { row: StatusRow }) {
  if (row.state === "checking") {
    return (
      <span className="inline-flex items-center gap-2 text-small text-muted-text" data-state="checking">
        <span aria-hidden className="inline-block size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        Checking
      </span>
    );
  }
  const tone = row.state === "up" ? "success" : row.state === "down" ? "warning" : "neutral";
  const label = row.state === "up" ? "Up" : row.state === "down" ? "Down" : "Not set up";
  return (
    <span data-state={row.state}>
      <Tag tone={tone}>{label}</Tag>
      {row.state === "down" && row.reason ? <p className="mt-1 text-xs text-muted-text">{row.reason}</p> : null}
    </span>
  );
}

export function ServiceStatus() {
  const [rows, setRows] = useState<StatusRow[]>(checking);
  const [running, setRunning] = useState(true);
  const runRef = useRef(0);

  const setRow = useCallback((key: StatusRow["key"], state: RowState, reason?: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, state, reason } : row)));
  }, []);

  const runChecks = useCallback(async () => {
    const run = ++runRef.current;
    const fresh = (): boolean => run === runRef.current;

    const backend = (async () => {
      try {
        // credentials: "include" so the login cookie rides this cross-origin call, like every other one.
        const res = await fetch(`${apiUrl}/api/status`, { credentials: "include", cache: "no-store" });
        if (res.status !== 200) throw new Error(`status ${String(res.status)}`);
        const body = (await res.json()) as { services: BackendServiceStatus[] };
        if (!fresh()) return;
        for (const service of body.services) setRow(service.key, service.state, service.reason);
      } catch {
        if (!fresh()) return;
        for (const row of ROWS) if (row.key !== "places") setRow(row.key, "down", SERVER_UNREACHED);
      }
    })();

    const places = checkPlaces(process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY).then((result) => {
      if (fresh()) setRow("places", result.state, result.reason);
    });

    await Promise.all([backend, places]);
    if (fresh()) setRunning(false);
  }, [setRow]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  function checkAgain() {
    setRows(checking());
    setRunning(true);
    void runChecks();
  }

  const th = "border-b border-hairline px-3 py-2.5 text-left align-bottom text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
  const td = "border-b border-hairline px-3 py-2.5 align-top text-secondary-text";

  return (
    <>
      <PageHeader
        title="Service status"
        subtitle="Each service is checked live when this page opens. Nothing is recorded."
        action={
          <PrimaryButton type="button" size="compact" disabled={running} onClick={checkAgain}>
            Check again
          </PrimaryButton>
        }
      />

      <div className="rounded-card border border-hairline bg-surface">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Service</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} data-service={row.key} className="last:[&>td]:border-b-0">
                  <td className={td}>
                    <span className="text-ink">{row.name}</span>
                    <p className="text-xs text-muted-text">({row.purpose})</p>
                  </td>
                  <td className={td}>
                    <StatusCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col md:hidden">
          {rows.map((row) => (
            <div key={row.key} data-service={row.key} className="border-b border-hairline p-3.5 last:border-b-0">
              <p className="text-ink">{row.name}</p>
              <p className="mb-1.5 text-xs text-muted-text">({row.purpose})</p>
              <StatusCell row={row} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
