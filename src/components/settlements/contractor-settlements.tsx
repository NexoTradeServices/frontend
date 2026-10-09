// The contractor's Settlements page -- Feature 6003, settlement run.
//
// Contractor Settlement (Next payout - "the contractor reads it on their settlements screen,
// never on their dashboard"). frontend-conventions.md: Templates / Layouts (List page with Record
// cards at every size), Organisms / Cards (Card, Record card), Molecules / Showing values
// (Amount), Molecules / Actions (Load more), Atoms / Tags and chips (Tag by meaning). Mobile first.
"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPay } from "./money";
import type { ContractorCard, ContractorList, NextPayout } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
const tagClass = "inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase";

/** Awaiting your approval: warning pair. Approved: neutral. Paid: success pair. */
const TAG_COLOURS: Record<ContractorCard["status"], string> = {
  draft: "bg-warning-bg text-brand-warning",
  approved: "bg-status-cancelled-bg text-status-cancelled",
  paid: "bg-success-bg text-brand-success",
};

function jobsText(count: number): string {
  return `${String(count)} ${count === 1 ? "job" : "jobs"}`;
}

/** "You'll be paid $805 plus GST for 2 jobs on Wed 21 Oct." */
function nextPayoutLine(next: NextPayout): string {
  const amount = `${formatPay(next.amount)}${next.plusGst ? " plus GST" : ""}`;
  const forJobs = next.jobs > 0 ? ` for ${jobsText(next.jobs)}` : "";
  return `You'll be paid ${amount}${forJobs} on ${next.payDay}.`;
}

function NextPayoutCard({ next }: { next: NextPayout }) {
  const waiting = next.jobs > 0 || next.adjustments > 0;
  return (
    <section data-testid="next-payout" className="rounded-[10px] border border-hairline bg-surface p-4 md:p-5">
      <h2 className="mb-3.5 font-heading text-base font-extrabold text-ink">Next payout</h2>
      {waiting ? (
        <>
          <span className={labelClass}>Waiting to be paid</span>
          <div className="font-heading text-[28px] font-extrabold text-ink tabular-nums" data-testid="next-payout-amount">
            {formatPay(next.amount)}
          </div>
          <p className="mt-1 text-sm text-secondary-text" data-testid="next-payout-line">
            {nextPayoutLine(next)}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-muted-text" data-testid="next-payout-line">
          Nothing waiting to be paid.
        </p>
      )}
    </section>
  );
}

function RecordCard({ card }: { card: ContractorCard }) {
  return (
    <Link
      href={`/contractor/settlements/${encodeURIComponent(card.reference)}`}
      data-testid="settlement-card"
      data-ref={card.reference}
      className="block rounded-[10px] border border-hairline bg-surface p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading text-[13px] font-extrabold text-ink">{card.reference}</span>
        <span className={`${tagClass} ${TAG_COLOURS[card.status]}`} data-testid="settlement-tag">
          {card.tag}
        </span>
      </div>
      <div className="mt-1.5 mb-0.5 text-[15px] font-bold text-ink">{card.period}</div>
      <div className="text-[13px] text-muted-text">
        <span className="block font-semibold text-secondary-text tabular-nums">{formatPay(card.amount)}</span>
        <span className="block">{card.dateLine}</span>
      </div>
    </Link>
  );
}

export function ContractorSettlements({ initial }: { initial: ContractorList }) {
  const [cards, setCards] = useState<ContractorCard[]>(initial.settlements);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (cursor === null) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/contractor/settlements?after=${encodeURIComponent(cursor)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const more = (await res.json()) as ContractorList;
      setCards((previous) => {
        const seen = new Set(previous.map((card) => card.reference));
        return [...previous, ...more.settlements.filter((card) => !seen.has(card.reference))];
      });
      setCursor(more.nextCursor);
      setError(null);
    } catch {
      setError("More invoices could not be loaded - check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <NextPayoutCard next={initial.nextPayout} />

      {error ? (
        <p role="status" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-[13px] text-brand-destructive">
          {error}
        </p>
      ) : null}

      {cards.length === 0 ? (
        <div data-testid="settlements-empty" className="rounded-[10px] border border-hairline bg-surface px-5 py-8 text-center text-sm text-secondary-text">
          No invoices yet. Your first one comes the Monday after your first finished job.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cards.map((card) => (
            <RecordCard key={card.reference} card={card} />
          ))}
        </div>
      )}

      {cursor !== null ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="min-h-11 w-full rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60 md:w-auto md:self-center"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
