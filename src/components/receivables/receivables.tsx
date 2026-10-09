// The Receivables page -- Feature 6002, Stripe payment and receivables.
//
// Invoicing / Invoice lifecycle - due, overdue, reminders: every invoice still owed,
// most overdue first (the order is the backend's). Patterns: a Fact grid with the
// count and the total; one Card "Still owed" holding a List table, which becomes
// Record cards below 768px; Load more at 50; the Empty state when nothing is owed.
// The whole row opens its job page.
//
// A paid invoice leaves the list by itself: the page re-reads every row it shows
// every 30 seconds while the tab is visible, and at once when it becomes visible again
// (the job queue's own rhythm).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDollars } from "@/components/request-a-job/money";
import type { ReceivableRow, ReceivablesResult } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const PAGE_SIZE = 50;
const REFRESH_MS = 30_000;

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
const tagClass = "inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase";
const warningTag = `${tagClass} bg-warning-bg text-brand-warning`;

async function fetchReceivables(params: { after?: string; limit?: number }): Promise<ReceivablesResult> {
  const query = new URLSearchParams();
  if (params.after) query.set("after", params.after);
  if (params.limit) query.set("limit", String(params.limit));
  const res = await fetch(`${apiUrl}/api/receivables?${query.toString()}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`receivables read failed: ${String(res.status)}`);
  return (await res.json()) as ReceivablesResult;
}

function jobHref(row: ReceivableRow): string {
  return `/ops/jobs/${encodeURIComponent(row.jobReference)}`;
}

function BilledTo({ row }: { row: ReceivableRow }) {
  if (row.billedTo.businessName === null) return <span className="block font-semibold text-ink">{row.billedTo.name}</span>;
  return (
    <>
      <span className="block font-semibold text-ink">{row.billedTo.businessName}</span>
      <span className="block text-xs text-muted-text">Attn: {row.billedTo.name}</span>
    </>
  );
}

/** "N days overdue" and "Due today" as warning Tags, "Due in N days" as muted text; "Waiting for pay link" as a warning Tag. */
function WhereItStands({ row }: { row: ReceivableRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5" data-testid="due-state">
      {row.due.kind === "later" ? (
        <span className="text-muted-text">{row.due.label}</span>
      ) : (
        <span className={warningTag}>{row.due.label}</span>
      )}
      {row.waitingForPayLink ? <span className={warningTag}>Waiting for pay link</span> : null}
    </span>
  );
}

function ReceivablesTable({ rows }: { rows: ReceivableRow[] }) {
  const router = useRouter();
  const th = "border-b border-hairline px-3 py-2.5 text-left align-bottom text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
  const td = "border-b border-hairline px-3 py-2.5 align-top text-secondary-text";
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Invoice</th>
            <th className={th}>Job</th>
            <th className={th}>Billed to</th>
            <th className={th}>Phone</th>
            <th className={`${th} text-right`}>Amount</th>
            <th className={th}>Due</th>
            <th className={th}>Where it stands</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.invoiceReference}
              data-ref={row.invoiceReference}
              tabIndex={0}
              onClick={() => router.push(jobHref(row))}
              onKeyDown={(event) => {
                if (event.key === "Enter") router.push(jobHref(row));
              }}
              className="cursor-pointer outline-none last:[&>td]:border-b-0 hover:bg-ground focus-visible:bg-ground"
            >
              <td className={td}>
                <Link
                  href={jobHref(row)}
                  onClick={(event) => event.stopPropagation()}
                  className="font-heading text-[13px] font-extrabold text-ink"
                >
                  {row.invoiceReference}
                </Link>
              </td>
              <td className={td}>{row.jobReference}</td>
              <td className={td}>
                <BilledTo row={row} />
              </td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{row.phone ?? "-"}</td>
              <td className={`${td} text-right font-semibold tabular-nums text-ink`}>{formatDollars(row.amount)}</td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{row.dueLabel}</td>
              <td className={td}>
                <WhereItStands row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceivableCards({ rows }: { rows: ReceivableRow[] }) {
  return (
    <div className="flex flex-col gap-2.5 md:hidden">
      {rows.map((row) => (
        <Link
          key={row.invoiceReference}
          href={jobHref(row)}
          data-ref={row.invoiceReference}
          className="block rounded-[10px] border border-hairline bg-surface p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-[13px] font-extrabold text-ink">{row.invoiceReference}</span>
            <WhereItStands row={row} />
          </div>
          <div className="mt-1.5 mb-0.5 font-heading text-[15px] font-extrabold text-ink">
            {row.billedTo.businessName ?? row.billedTo.name}
          </div>
          <div className="text-[13px] text-muted-text">
            {row.billedTo.businessName !== null ? <span className="block">Attn: {row.billedTo.name}</span> : null}
            <span className="block tabular-nums">
              {formatDollars(row.amount)} - due {row.dueLabel}
            </span>
            <span className="block">{row.jobReference}</span>
            {row.phone ? <span className="block tabular-nums">{row.phone}</span> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-secondary-text">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-muted-text" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p>Nobody owes anything right now.</p>
    </div>
  );
}

export function Receivables({ initial }: { initial: ReceivablesResult }) {
  const [data, setData] = useState<ReceivablesResult>(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowCountRef = useRef(initial.rows.length);
  const requestIdRef = useRef(0);

  useEffect(() => {
    rowCountRef.current = data.rows.length;
  }, [data.rows.length]);

  // The latest request wins: a slow refresh never overwrites a newer answer.
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await fetchReceivables({ limit: Math.max(PAGE_SIZE, rowCountRef.current) });
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("The list could not refresh - check your connection. It tries again in 30 seconds.");
    }
  }, []);

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") void refresh();
    }
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  async function loadMore() {
    if (data.nextCursor === null) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const result = await fetchReceivables({ after: data.nextCursor });
      if (requestId !== requestIdRef.current) return;
      setData((previous) => {
        const seen = new Set(previous.rows.map((row) => row.invoiceReference));
        return { ...result, rows: [...previous.rows, ...result.rows.filter((row) => !seen.has(row.invoiceReference))] };
      });
      setError(null);
    } catch {
      setError("More invoices could not be loaded - check your connection and try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4.5 gap-y-3.5 sm:grid-cols-4" data-testid="receivables-facts">
        <div>
          <span className={labelClass}>Unpaid invoices</span>
          <div className="font-semibold text-ink tabular-nums" data-testid="unpaid-count">
            {data.count}
          </div>
        </div>
        <div>
          <span className={labelClass}>Owed in total</span>
          <div className="font-semibold text-ink tabular-nums" data-testid="owed-total">
            {formatDollars(data.total)}
          </div>
        </div>
      </div>

      {error ? (
        <p role="status" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-[13px] text-brand-destructive">
          {error}
        </p>
      ) : null}

      <section className="rounded-[10px] border border-hairline bg-surface p-4 md:p-5">
        <h2 className="font-heading text-base font-extrabold text-ink">Still owed</h2>
        <div className="mt-3.5">
          {data.rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ReceivablesTable rows={data.rows} />
              <ReceivableCards rows={data.rows} />
            </>
          )}
        </div>
      </section>

      {data.rows.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          {data.nextCursor !== null ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="min-h-11 w-full rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60 md:w-auto"
            >
              {loadingMore ? "Loading..." : "Load 50 more"}
            </button>
          ) : null}
          <p className="text-xs text-muted-text tabular-nums">
            Showing {data.rows.length} of {data.count}
          </p>
        </div>
      ) : null}
    </div>
  );
}
