// The job queue -- Feature 4001, ops job queue and job detail.
//
// Operations Admin Workflow / The job queue and the job page: open work
// only, the status chips with their counts, search across every status,
// new jobs first (the longest-waiting on top), then the rest by soonest
// slot -- the order itself is the backend's (plan decision 5). Patterns:
// Table to cards (a table from 768px, Card anatomy cards below it), List
// pagination (Load 50 more), and the chip row that scrolls sideways in one
// row on a phone (Components / Component library).
//
// Plan decision 3: "in real time" is this page re-reading the list every
// 30 seconds, and only while the tab is visible -- a hidden tab costs
// nothing, and coming back to it refreshes at once.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusTag } from "@/components/ui/status-tag";
import { SOURCE_LABELS, type QueueResult, type QueueRow, type StatusFilter } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const PAGE_SIZE = 50;
const REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

const CHIPS: readonly { key: StatusFilter; label: string }[] = [
  { key: "open", label: "All open" },
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "on_hold", label: "On hold" },
  { key: "closed", label: "Closed" },
];

async function fetchQueue(status: StatusFilter, q: string, offset: number, limit: number): Promise<QueueResult> {
  const params = new URLSearchParams({ status, offset: String(offset), limit: String(limit) });
  if (q !== "") params.set("q", q);
  const res = await fetch(`${apiUrl}/api/jobs?${params.toString()}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`queue read failed: ${String(res.status)}`);
  return (await res.json()) as QueueResult;
}

function jobHref(row: QueueRow): string {
  return `/ops/jobs/${encodeURIComponent(row.reference)}`;
}

function ContractorLine({ row }: { row: QueueRow }) {
  if (row.contractor) {
    return (
      <>
        <span className="block font-semibold text-ink">{row.contractor.name}</span>
        <span className="block text-xs text-muted-text">{row.contractor.standing}</span>
      </>
    );
  }
  return <span className="block text-xs text-muted-text">{row.status === "new" ? "Not dispatched" : "-"}</span>;
}

function NoSiteFlag({ row }: { row: QueueRow }) {
  if (!row.noSiteAddress) return null;
  return <span className="mt-0.5 block text-xs text-brand-warning">No site address yet - call not made</span>;
}

function QueueTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  // Tighter cells below 1024px: a tablet gets the full width but still has
  // to fit seven columns. The box scrolls on its own if a row ever cannot
  // fit -- a column is never clipped, and the page never scrolls sideways.
  const th = "border-b border-hairline px-2 py-2.5 text-left align-bottom text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase lg:px-3";
  const td = "border-b border-hairline px-2 py-3 align-top text-secondary-text lg:px-3";
  return (
    <div className="hidden overflow-x-auto rounded-[10px] border border-hairline bg-surface md:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Job</th>
            <th className={th}>Customer</th>
            <th className={th}>Trade and suburb</th>
            <th className={th}>Wanted</th>
            <th className={th}>Received</th>
            <th className={th}>Contractor</th>
            <th className={th}>Via</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.reference}
              data-ref={row.reference}
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
                  className="mb-1 block font-heading text-[13px] font-extrabold text-ink"
                >
                  {row.reference}
                </Link>
                <StatusTag status={row.status} />
              </td>
              <td className={td}>
                <span className="block font-semibold text-ink">{row.customerName}</span>
                <span className="block text-xs text-muted-text">{row.customerCode}</span>
                <NoSiteFlag row={row} />
              </td>
              <td className={td}>
                <span className="block font-semibold text-ink">{row.trade}</span>
                <span className="block text-xs text-muted-text">
                  {row.suburb} {row.postcode}
                </span>
              </td>
              <td className={`${td} tabular-nums`}>
                {row.wantedDate}
                <span className="block text-xs text-muted-text">{row.windowLabel}</span>
              </td>
              <td className={`${td} tabular-nums`}>
                {row.receivedLabel}
                {row.waiting ? <span className="block text-xs text-brand-warning">Waiting {row.waiting}</span> : null}
                {row.closedLabel ? <span className="block text-xs text-muted-text">{row.closedLabel}</span> : null}
              </td>
              <td className={td}>
                <ContractorLine row={row} />
              </td>
              <td className={td}>{SOURCE_LABELS[row.source]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueueCards({ rows }: { rows: QueueRow[] }) {
  return (
    <div className="flex flex-col gap-2.5 md:hidden">
      {rows.map((row) => (
        <Link
          key={row.reference}
          href={jobHref(row)}
          data-ref={row.reference}
          className="block rounded-[10px] border border-hairline bg-surface p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-[13px] font-extrabold text-ink">{row.reference}</span>
            <StatusTag status={row.status} />
          </div>
          <div className="mt-1.5 mb-0.5 font-heading text-[15px] font-extrabold text-ink">
            {row.customerName} <span className="font-body text-xs font-normal text-muted-text">{row.customerCode}</span>
          </div>
          <div className="text-[13px] text-secondary-text">
            <span className="block">
              {row.trade} - {row.suburb} {row.postcode}
            </span>
            <span className="block tabular-nums">
              Wanted {row.wantedDate}, {row.windowLabel}
            </span>
            <span className="block tabular-nums">
              Received {row.receivedLabel} via {SOURCE_LABELS[row.source]}
            </span>
            {row.waiting ? <span className="block text-brand-warning">Waiting {row.waiting}</span> : null}
            {row.contractor ? (
              <span className="block">
                {row.contractor.name} - {row.contractor.standing}
              </span>
            ) : null}
            {row.closedLabel ? <span className="block">{row.closedLabel}</span> : null}
            <NoSiteFlag row={row} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ searched }: { searched: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[10px] border border-hairline bg-surface px-5 py-8 text-center text-sm text-secondary-text">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-muted-text" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 13h5l1.5 2h5L16 13h5" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p>
        {searched !== ""
          ? `No job matches "${searched}". Try the job number, the CUS code or a phone number.`
          : "Nothing here right now. New enquiries appear here on their own."}
      </p>
    </div>
  );
}

export function JobQueue({ initial }: { initial: QueueResult }) {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<QueueResult>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the list currently shows, read by the poll and by Load more without
  // re-creating either on every keystroke.
  const filterRef = useRef<{ status: StatusFilter; q: string }>({ status: "open", q: "" });
  const filterVersionRef = useRef(0);
  const requestIdRef = useRef(0);
  const rowCountRef = useRef(initial.rows.length);

  useEffect(() => {
    rowCountRef.current = data.rows.length;
  }, [data.rows.length]);

  // The latest request wins: a slow earlier answer never overwrites a newer one.
  const load = useCallback(async (limit: number) => {
    const requestId = ++requestIdRef.current;
    const { status: s, q } = filterRef.current;
    try {
      const result = await fetchQueue(s, q, 0, limit);
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("The queue could not refresh - check your connection. It tries again in 30 seconds.");
    }
  }, []);

  const reload = useCallback(
    (next: { status: StatusFilter; q: string }) => {
      filterRef.current = next;
      filterVersionRef.current += 1;
      setLoading(true);
      void load(PAGE_SIZE).finally(() => setLoading(false));
    },
    [load],
  );

  // Plan decision 3: every 30 seconds while the tab is visible, and at once
  // when it becomes visible again. The poll re-reads every row already loaded.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      void load(Math.max(PAGE_SIZE, rowCountRef.current));
    }
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  // Search is server-side and spans every status (plan decision 4).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === filterRef.current.q) return;
    const timer = window.setTimeout(() => reload({ status: filterRef.current.status, q: trimmed }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, reload]);

  function chooseChip(next: StatusFilter) {
    setStatus(next);
    setQuery("");
    reload({ status: next, q: "" });
  }

  async function loadMore() {
    const version = filterVersionRef.current;
    const { status: s, q } = filterRef.current;
    setLoadingMore(true);
    try {
      const result = await fetchQueue(s, q, data.rows.length, PAGE_SIZE);
      if (version !== filterVersionRef.current) return;
      setData((previous) => {
        const seen = new Set(previous.rows.map((row) => row.reference));
        return { ...result, rows: [...previous.rows, ...result.rows.filter((row) => !seen.has(row.reference))] };
      });
      setError(null);
    } catch {
      setError("More jobs could not be loaded - check your connection and try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const searched = query.trim();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <input
          type="search"
          aria-label="Search jobs"
          placeholder="Search job, customer code, name or phone"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full max-w-[420px] min-w-0 flex-[1_1_280px] rounded-md border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
        <div
          role="group"
          aria-label="Filter by status"
          className="-mx-4 flex min-w-0 flex-[1_1_100%] flex-nowrap gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-[0_1_auto] md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {CHIPS.map((chip) => {
            const pressed = searched === "" && status === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={pressed}
                onClick={() => chooseChip(chip.key)}
                className={`min-h-11 shrink-0 rounded-full border px-3 text-[13px] font-semibold ${
                  pressed ? "border-ink bg-ink text-white" : "border-hairline bg-surface text-secondary-text"
                }`}
              >
                {chip.label}
                <span className="ml-1 tabular-nums opacity-75">{data.counts[chip.key]}</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-text tabular-nums md:ml-auto">
          Updated {data.updatedLabel} - refreshes every 30 seconds
        </span>
      </div>

      {error ? (
        <p role="status" className="mb-3 rounded-md border border-error-border bg-error-bg px-3 py-2 text-[13px] text-brand-destructive">
          {error}
        </p>
      ) : null}

      <div aria-busy={loading} className={loading ? "opacity-60" : undefined}>
        {data.rows.length === 0 ? (
          <EmptyState searched={searched} />
        ) : (
          <>
            <QueueTable rows={data.rows} />
            <QueueCards rows={data.rows} />
          </>
        )}
      </div>

      {data.rows.length > 0 ? (
        <div className="flex flex-col items-center gap-2 pt-3.5">
          {data.hasMore ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="min-h-11 rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load 50 more"}
            </button>
          ) : null}
          <p className="text-xs text-muted-text tabular-nums">
            Showing {data.rows.length} of {data.total}
          </p>
        </div>
      ) : null}
    </div>
  );
}
