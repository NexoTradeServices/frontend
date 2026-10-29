// The customer portal's three lists -- Feature 6010: Jobs, Invoices, Payments.
//
// Pages / Which layout each kind of page takes: List pages. Each is a table from 768px and Record
// cards on a phone, with Load more (50 a page) and its own Empty state.
"use client";

import { PrimaryLink } from "@/components/auth/buttons";
import { formatDollars } from "@/components/request-a-job/money";
import { EmptyState, InvoiceStatusTag, JobStatusTag, LoadMoreFooter, RecordTable, usePagedRows, type Column } from "./parts";

interface Paged<T> {
  rows: T[];
  total: number;
  hasMore: boolean;
}

export interface JobRow {
  reference: string;
  trade: string;
  suburb: string;
  status: string;
  when: string;
}

const JOB_COLUMNS: Column<JobRow>[] = [
  { header: "Job", cell: (row) => row.reference },
  { header: "Trade", cell: (row) => row.trade },
  { header: "Suburb", cell: (row) => row.suburb },
  { header: "When", cell: (row) => <span className="tabular-nums">{row.when}</span> },
  { header: "Status", cell: (row) => <JobStatusTag word={row.status} /> },
];

export function JobsList({ initial }: { initial: Paged<JobRow> }) {
  const paged = usePagedRows<JobRow>("/jobs", initial);
  if (paged.rows.length === 0) {
    return (
      <EmptyState
        action={
          <PrimaryLink href="/request-a-job" size="compact">
            Request a job
          </PrimaryLink>
        }
      >
        No jobs yet.
      </EmptyState>
    );
  }
  return (
    <>
      <RecordTable testId="jobs-list" rows={paged.rows} columns={JOB_COLUMNS} rowKey={(row) => row.reference} href={(row) => `/account/jobs/${encodeURIComponent(row.reference)}`} />
      <LoadMoreFooter shown={paged.rows.length} total={paged.total} hasMore={paged.hasMore} loading={paged.loading} onMore={() => void paged.loadMore()} />
    </>
  );
}

export interface InvoiceRow {
  reference: string;
  jobReference: string;
  issued: string;
  amount: number;
  status: string;
}

const INVOICE_COLUMNS: Column<InvoiceRow>[] = [
  { header: "Invoice", cell: (row) => row.reference },
  { header: "Job", cell: (row) => row.jobReference },
  { header: "Issued", cell: (row) => <span className="tabular-nums">{row.issued}</span> },
  { header: "Total", cell: (row) => <span className="tabular-nums">{formatDollars(row.amount)}</span>, className: "text-right" },
  { header: "Status", cell: (row) => <InvoiceStatusTag word={row.status} /> },
];

export function InvoicesList({ initial }: { initial: Paged<InvoiceRow> }) {
  const paged = usePagedRows<InvoiceRow>("/invoices", initial);
  if (paged.rows.length === 0) return <EmptyState>No invoices yet.</EmptyState>;
  return (
    <>
      <RecordTable testId="invoices-list" rows={paged.rows} columns={INVOICE_COLUMNS} rowKey={(row) => row.reference} href={(row) => `/account/invoices/${encodeURIComponent(row.reference)}`} />
      <LoadMoreFooter shown={paged.rows.length} total={paged.total} hasMore={paged.hasMore} loading={paged.loading} onMore={() => void paged.loadMore()} />
    </>
  );
}

export interface PaymentRow {
  kind: "payment" | "refund";
  date: string;
  what: string;
  how: string;
  amount: number;
  receipt: string | null;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const PAYMENT_COLUMNS: Column<PaymentRow>[] = [
  { header: "Date", cell: (row) => <span className="tabular-nums">{row.date}</span> },
  { header: "What", cell: (row) => row.what },
  { header: "How", cell: (row) => row.how },
  { header: "Amount", cell: (row) => <span className="tabular-nums">{formatDollars(row.amount)}</span>, className: "text-right" },
  {
    header: "Receipt",
    cell: (row) =>
      row.receipt !== null ? (
        <a
          href={`${apiUrl}/api/account/refunds/${encodeURIComponent(row.receipt)}/pdf`}
          className="inline-flex min-h-11 items-center text-small font-semibold text-secondary-text underline underline-offset-2"
        >
          Receipt (PDF)
        </a>
      ) : (
        <span className="text-muted-text">-</span>
      ),
  },
];

export function PaymentsList({ rows }: { rows: PaymentRow[] }) {
  if (rows.length === 0) return <EmptyState>No payments yet.</EmptyState>;
  return <RecordTable testId="payments-list" rows={rows} columns={PAYMENT_COLUMNS} rowKey={(row) => `${row.what}|${row.date}`} />;
}
