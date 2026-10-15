// The Refunds list -- Feature 6006, refunds.
//
// Refunds: every refund, newest first (the order is the backend's). Pages: a List page in the
// Wide container -- one Card holding a List table that becomes Record cards below 768px, Page
// numbers under it (Molecules / Paging a list, 50 a page, the page kept in the address), the Empty
// state "No refunds yet." when there are none. Status is a Tag (Atoms / Tag): Pending warning,
// Refunded success, Failed the destructive pair. The whole row opens its job page.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageNumbers } from "@/components/ui/page-numbers";
import { REFUND_TAGS, refundMoney } from "./money";
import type { RefundRow, RefundsResult } from "./types";

const tagClass = "inline-block shrink-0 rounded px-2 py-0.5 text-field-label font-bold tracking-[0.04em] whitespace-nowrap uppercase";

function jobHref(row: RefundRow): string {
  return `/ops/jobs/${encodeURIComponent(row.jobReference)}`;
}

function StatusTag({ row }: { row: RefundRow }) {
  return (
    <span data-refund-status={row.status} className={`${tagClass} ${REFUND_TAGS[row.status].pair}`}>
      {REFUND_TAGS[row.status].label}
    </span>
  );
}

function RefundsTable({ rows }: { rows: RefundRow[] }) {
  const router = useRouter();
  const th = "border-b border-hairline px-3 py-2.5 text-left align-bottom text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
  const td = "border-b border-hairline px-3 py-2.5 align-top text-secondary-text";
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-sm" data-testid="refunds-table">
        <thead>
          <tr>
            <th className={th}>Receipt</th>
            <th className={th}>Date</th>
            <th className={th}>Customer</th>
            <th className={th}>Job</th>
            <th className={th}>Invoice</th>
            <th className={`${th} text-right`}>Amount</th>
            <th className={th}>Status</th>
            <th className={th}>Made by</th>
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
                <Link href={jobHref(row)} onClick={(event) => event.stopPropagation()} className="font-heading text-small font-extrabold text-ink">
                  {row.reference}
                </Link>
              </td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{row.dateLabel}</td>
              <td className={`${td} font-semibold text-ink`}>{row.customerName}</td>
              <td className={td}>{row.jobReference}</td>
              <td className={td}>{row.invoiceReference}</td>
              <td className={`${td} text-right font-semibold tabular-nums text-ink`}>{refundMoney(row.amount)}</td>
              <td className={td}>
                <StatusTag row={row} />
              </td>
              <td className={td}>{row.madeBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefundCards({ rows }: { rows: RefundRow[] }) {
  return (
    <div className="flex flex-col gap-2.5 md:hidden" data-testid="refunds-cards">
      {rows.map((row) => (
        <Link key={row.reference} href={jobHref(row)} data-ref={row.reference} className="block rounded-card border border-hairline bg-surface p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-small font-extrabold text-ink">{row.reference}</span>
            <StatusTag row={row} />
          </div>
          <div className="mt-1.5 mb-0.5 font-heading text-name font-extrabold text-ink">{row.customerName}</div>
          <div className="text-small text-muted-text">
            <span className="block tabular-nums">
              {refundMoney(row.amount)} - {row.dateLabel}
            </span>
            <span className="block">
              {row.jobReference} - {row.invoiceReference}
            </span>
            <span className="block">Made by {row.madeBy}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div data-testid="refunds-empty" className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-secondary-text">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-muted-text" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p>No refunds yet.</p>
    </div>
  );
}

export function RefundsList({ data }: { data: RefundsResult }) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-4 md:p-5">
      {data.rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <RefundsTable rows={data.rows} />
          <RefundCards rows={data.rows} />
          <PageNumbers
            page={data.page}
            pageCount={data.pageCount}
            from={data.from}
            to={data.to}
            total={data.total}
            hrefFor={(n) => (n === 1 ? "/ops/refunds" : `/ops/refunds?page=${String(n)}`)}
          />
        </>
      )}
    </section>
  );
}
