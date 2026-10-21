// The Reviews tab's content -- Feature 6009, ratings and reviews.
//
// Ratings & Reviews: what customers said about this contractor. On top the average as read-only stars
// and "4.6 from 12 reviews"; then the reviews newest first, divided by hairlines (Organisms / Notes log
// rows, no add form): the date, the job reference as a Link, the stars, her comment under them or
// "No comment." muted. Molecules / Load more after 50 (a contractor's reviews are read top to bottom and
// stay small). Nothing here shows the business's 0-10 "recommend us" score -- it rates the business,
// never the contractor.
"use client";

import { useState } from "react";
import Link from "next/link";
import { StarsShown } from "@/components/ui/star-rating";
import type { ContractorReviews } from "@/components/reviews/types";
import { ContractorRecordHeader } from "./record-header";
import type { ContractorDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export function ContractorReviewsPanel({ contractor, initial }: { contractor: ContractorDto; initial: ContractorReviews }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (data.nextCursor === null) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/contractors/${contractor.code}/reviews?cursor=${encodeURIComponent(data.nextCursor)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status !== 200) throw new Error(String(res.status));
      const next = (await res.json()) as ContractorReviews;
      setData((previous) => {
        const seen = new Set(previous.reviews.map((row) => row.id));
        return { ...next, reviews: [...previous.reviews, ...next.reviews.filter((row) => !seen.has(row.id))] };
      });
      setError("");
    } catch {
      setError("More reviews could not be loaded - check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ContractorRecordHeader contractor={contractor} activeTab="reviews" />
      <section className="rounded-card border border-hairline bg-surface p-4 md:p-5">
        {data.average !== null && data.count > 0 ? (
          <div data-testid="reviews-summary" className="flex items-center gap-2 border-b border-hairline pb-3.5">
            <StarsShown value={data.average} />
            <span className="text-body font-bold text-ink tabular-nums">
              {data.average} from {data.count} review{data.count === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}

        {data.reviews.length === 0 ? (
          <p data-testid="reviews-empty" className="py-6 text-center text-small text-muted-text">
            No reviews yet.
          </p>
        ) : (
          <ul data-testid="reviews-list" className="divide-y divide-hairline">
            {data.reviews.map((row) => (
              <li key={row.id} data-testid="review-row" className="py-3.5 first:pt-3.5 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-small text-muted-text">{row.createdLabel}</span>
                  <Link href={`/ops/jobs/${row.jobReference}`} className="text-small font-bold text-ink underline underline-offset-2">
                    {row.jobReference}
                  </Link>
                  <StarsShown value={row.rating} />
                </div>
                {row.reviewText ? (
                  <p className="mt-1.5 text-body text-ink">{row.reviewText}</p>
                ) : (
                  <p className="mt-1.5 text-small text-muted-text">No comment.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p role="alert" className="mt-3 text-small text-brand-destructive">
          {error}
        </p>
      ) : null}
      {data.nextCursor !== null ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="min-h-11 w-full rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60 md:w-auto"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
          <p className="text-xs text-muted-text tabular-nums">
            Showing {data.reviews.length} of {data.count}
          </p>
        </div>
      ) : null}
    </div>
  );
}
