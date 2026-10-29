// Small pieces the customer portal's pages share -- Feature 6010, customer portal.
//
// Card and Fact as the other Record pages draw them (Organisms / Cards, Molecules / Showing values), a
// List page's table that becomes Record cards on a phone (Organisms / Lists and tables), the Load more
// footer (Molecules / Paging a list), the status wording as tags, and the Not found card.
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { StatusTag, type JobStatus } from "@/components/ui/status-tag";
import { Tag } from "@/components/ui/tag";
import { MessageCard } from "@/components/ui/message-card";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
export const labelClass = "block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";

export function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative rounded-card border border-hairline bg-surface p-5">
      <h2 className="font-heading text-base font-extrabold text-ink">
        {title}
        {aside ? <small className="ml-1.5 font-body text-xs font-normal text-muted-text">{aside}</small> : null}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "col-span-full" : undefined}>
      <span className={labelClass}>{label}</span>
      <div className="font-semibold text-ink">{children}</div>
    </div>
  );
}

const JOB_WORDS: Record<string, JobStatus> = {
  Requested: "new",
  Booked: "scheduled",
  "In progress": "in_progress",
  "On hold": "on_hold",
  Done: "completed",
  Cancelled: "cancelled",
};

/** Her wording for a job's status, in the shared status colours. */
export function JobStatusTag({ word }: { word: string }) {
  return <StatusTag status={JOB_WORDS[word] ?? "new"} label={word} />;
}

/** Open warning pair, Paid success pair, Void neutral pair. */
export function InvoiceStatusTag({ word }: { word: string }) {
  return <Tag tone={word === "Paid" ? "success" : word === "Void" ? "neutral" : "warning"}>{word}</Tag>;
}

export function NotFoundCard() {
  return (
    <MessageCard title="We can't find that" primary={{ label: "Back to your jobs", href: "/account/jobs" }}>
      <p>That page is not one of yours, or it is no longer there.</p>
    </MessageCard>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

const th = "px-3 py-2 text-left align-bottom text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
const td = "px-3 py-2.5 align-top text-secondary-text";

/** A table from 768px, Record cards below it. `href` opens the row; `leadAction` is a row's own control. */
export function RecordTable<T>({ rows, columns, href, rowKey, testId }: { rows: T[]; columns: Column<T>[]; href?: (row: T) => string; rowKey: (row: T) => string; testId: string }) {
  return (
    <div data-testid={testId}>
      <div className="hidden overflow-x-auto rounded-card border border-hairline bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {columns.map((column) => (
                <th key={column.header} className={th}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-hairline last:border-b-0">
                {columns.map((column, index) => (
                  <td key={column.header} className={`${td} ${column.className ?? ""}`}>
                    {index === 0 && href ? (
                      <Link href={href(row)} className="font-heading font-extrabold text-ink underline underline-offset-2">
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const card = (
            <>
              <div className="font-heading text-small font-extrabold text-ink">{columns[0]?.cell(row)}</div>
              <div className="mt-1.5 grid gap-1 text-small text-secondary-text">
                {columns.slice(1).map((column) => (
                  <div key={column.header} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-text">{column.header}</span>
                    <span className="text-right">{column.cell(row)}</span>
                  </div>
                ))}
              </div>
            </>
          );
          return href ? (
            <Link key={rowKey(row)} href={href(row)} className="block rounded-card border border-hairline bg-surface p-3.5">
              {card}
            </Link>
          ) : (
            <div key={rowKey(row)} className="rounded-card border border-hairline bg-surface p-3.5">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A paged list: the first page from the server, "Load 50 more" for the rest, "Showing n of N". */
export function usePagedRows<T>(path: string, initial: { rows: T[]; total: number; hasMore: boolean }) {
  const [rows, setRows] = useState(initial.rows);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/account${path}?offset=${String(rows.length)}&limit=50`, { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const next = (await res.json()) as { rows: T[]; hasMore: boolean };
        setRows((prev) => [...prev, ...next.rows]);
        setHasMore(next.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }
  return { rows, total: initial.total, hasMore, loading, loadMore };
}

export function LoadMoreFooter({ shown, total, hasMore, loading, onMore }: { shown: number; total: number; hasMore: boolean; loading: boolean; onMore: () => void }) {
  if (shown === 0) return null;
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      {hasMore ? (
        <button
          type="button"
          onClick={onMore}
          disabled={loading}
          className="min-h-11 w-full rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60 md:w-auto"
        >
          {loading ? "Loading..." : "Load 50 more"}
        </button>
      ) : null}
      <p className="text-xs text-muted-text tabular-nums">
        Showing {shown} of {total}
      </p>
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-5 text-sm text-muted-text">
      <p>{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
