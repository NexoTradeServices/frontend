// The contractor's invoice as a Card -- Feature 6003, settlement run.
//
// frontend-conventions.md: Organisms / Cards (Card), Molecules / Showing values (Fact grid),
// Organisms / Lists and tables (Line items table and its "GST added on top" and pay-line rules).
// ONE card, used by the approve page, the contractor's settlement page and the ops drill-down, so
// the three look the same.
//
//   Facts            From, To, Period, Date
//   Line items       one pay line per job - reference, day and date, trade, hours, amount - each
//                    opening to its working; a weekend line carries "T1.5" after the hours and one
//                    Caption under the table explains it
//   Adjustments      their own lines, the reason as the description
//   GST on top       registered only: Subtotal, then GST; not registered: neither line
//   Materials        a block set off by a hairline, headed "Materials reimbursement - per
//                    receipts, not subject to GST", its lines under it
//   Total            under the 2px ink border
"use client";

import { useState } from "react";
import { formatPay, hoursText } from "./money";
import type { InvoiceView, PayLine } from "./types";

/**
 * Each pay line can open to show how its amount was worked out (the plan's drill-down). The owner
 * chose not to show the link for now; the working, its data and this switch stay, so showing it
 * again is a one-word change.
 */
const SHOW_WORKING = false;

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
const th = "px-1.5 py-2 text-left align-bottom text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase sm:px-3";
const td = "px-1.5 py-2.5 align-top text-secondary-text sm:px-3";

function weekendCode(view: InvoiceView): string {
  return `T${String(view.weekendMultiplier)}`;
}

function Working({ line, view }: { line: PayLine; view: InvoiceView }) {
  const working = line.working;
  if (working.kind === "no_show") {
    return <p>No-show call-out - the visit was cancelled on arrival, and the call-out is still paid.</p>;
  }
  const first = `Call-out ${formatPay(working.calloutRate)} covers turning up and the first hour.`;
  const extra =
    working.extraHours > 0
      ? `${hoursText(working.extraHours)} after the first at ${formatPay(working.standardRate)} an hour = ${formatPay(working.extraTotal)}.`
      : "No hours after the first.";
  return (
    <p>
      {first} {extra}
      {working.multiplier !== 1 ? ` ${weekendCode(view)} - weekend, rates at time and a half.` : ""}
    </p>
  );
}

function PayLineRows({ line, view }: { line: PayLine; view: InvoiceView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr data-testid="pay-line" data-job={line.jobReference} className="border-b border-hairline">
        <td className={td}>
          <span className="block font-heading text-[13px] font-extrabold text-ink">{line.jobReference}</span>
          <span className="block text-[12px] text-muted-text sm:hidden">{line.trade}</span>
        </td>
        <td className={`${td} whitespace-nowrap`}>{line.day}</td>
        <td className={`${td} hidden sm:table-cell`}>{line.trade}</td>
        <td className={`${td} whitespace-nowrap tabular-nums`}>
          {line.hours === null ? "-" : hoursText(line.hours)}
          {line.weekend ? <span data-testid="weekend-code"> ({weekendCode(view)})</span> : null}
        </td>
        <td className={`${td} text-right whitespace-nowrap`}>
          <span className="block font-semibold text-ink tabular-nums">{formatPay(line.amount)}</span>
          {SHOW_WORKING ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center text-[13px] font-semibold text-secondary-text underline underline-offset-2"
          >
            {open ? "Hide working" : "Working"}
          </button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr data-testid="pay-line-working" className="border-b border-hairline bg-ground">
          <td colSpan={5} className="px-3 py-2.5 text-[13px] text-secondary-text">
            <Working line={line} view={view} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Fact({ label, children, testId }: { label: string; children: React.ReactNode; testId: string }) {
  return (
    <div data-testid={testId}>
      <span className={labelClass}>{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

export function InvoiceCard({ invoice }: { invoice: InvoiceView }) {
  const anyWeekend = invoice.lines.some((line) => line.weekend);
  const businessName = invoice.from.businessName ?? invoice.from.name;
  return (
    <section data-testid="invoice-card" className="rounded-[10px] border border-hairline bg-surface p-4 md:p-5">
      <div className="flex flex-col gap-3.5">
        <Fact label="From" testId="invoice-from">
          <span className="block font-semibold">{businessName}</span>
          {invoice.from.businessName !== null ? <span className="block text-[13px] text-muted-text">{invoice.from.name}</span> : null}
          {invoice.from.abn !== null ? <span className="block text-[13px] text-muted-text">ABN {invoice.from.abn}</span> : null}
        </Fact>
        <Fact label="To" testId="invoice-to">
          <span className="block font-semibold">{invoice.to.name}</span>
          {invoice.to.abn !== null ? <span className="block text-[13px] text-muted-text">ABN {invoice.to.abn}</span> : null}
          {invoice.to.address !== null ? <span className="block text-[13px] text-muted-text">{invoice.to.address}</span> : null}
        </Fact>
        <div className="grid grid-cols-2 gap-x-4.5">
          <Fact label="Period" testId="invoice-period">
            {invoice.period.label}
          </Fact>
          <Fact label="Date" testId="invoice-date">
            {invoice.dateLabel}
          </Fact>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="invoice-lines">
          <thead>
            <tr className="border-b border-hairline">
              <th className={th}>Job</th>
              <th className={th}>Day</th>
              <th className={`${th} hidden sm:table-cell`}>Trade</th>
              <th className={th}>Hours</th>
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <PayLineRows key={line.jobReference} line={line} view={invoice} />
            ))}
            {invoice.adjustments.map((adjustment, index) => (
              <tr key={`adjustment-${String(index)}`} data-testid="adjustment-line" className="border-b border-hairline">
                <td className={td} colSpan={4}>
                  {adjustment.reason}
                  {adjustment.jobReference !== null ? <span className="text-muted-text"> ({adjustment.jobReference})</span> : null}
                </td>
                <td className={`${td} text-right font-semibold whitespace-nowrap text-ink tabular-nums`}>{formatPay(adjustment.amount)}</td>
              </tr>
            ))}
            {invoice.gstRegistered ? (
              <>
                <tr data-testid="subtotal-row">
                  <td className={`${td} text-right`} colSpan={4}>
                    Subtotal
                  </td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPay(invoice.subtotal)}</td>
                </tr>
                <tr data-testid="gst-row" className="border-b border-hairline">
                  <td className={`${td} text-right`} colSpan={4}>
                    GST
                  </td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPay(invoice.gst ?? 0)}</td>
                </tr>
              </>
            ) : null}
            {invoice.materials.length > 0 ? (
              <>
                <tr data-testid="materials-heading">
                  <td colSpan={5} className="px-1.5 pt-3.5 pb-1 text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase sm:px-3">
                    Materials reimbursement - per receipts, not subject to GST
                  </td>
                </tr>
                {invoice.materials.map((material, index) => (
                  <tr key={`material-${String(index)}`} data-testid="materials-line" className="border-b border-hairline">
                    <td className={td} colSpan={4}>
                      {material.name} <span className="text-muted-text">({material.jobReference})</span>
                    </td>
                    <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPay(material.amount)}</td>
                  </tr>
                ))}
              </>
            ) : null}
            <tr data-testid="total-row" className="border-t-2 border-ink">
              <td className={`${td} text-right font-heading font-extrabold text-ink`} colSpan={4}>
                Total
              </td>
              <td className={`${td} text-right font-heading font-extrabold whitespace-nowrap text-ink tabular-nums`}>{formatPay(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {anyWeekend ? (
        <p data-testid="weekend-legend" className="mt-2 text-xs text-muted-text">
          {weekendCode(invoice)} - weekend, time and a half
        </p>
      ) : null}
    </section>
  );
}
