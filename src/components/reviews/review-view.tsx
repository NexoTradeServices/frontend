// The review page's open state -- Feature 6009, ratings and reviews.
//
// Ratings & Reviews: the customer picks 1-5 stars (required), may add a comment and answer "How likely
// are you to recommend us to a friend?" 0-10, then taps Send. frontend-conventions.md: Templates /
// Layouts (Record page with one Card, in the Focused shell, Medium container), Molecules / Star rating
// and Score row, Atoms / Multi-line box, Button (Primary, loading state).
//
//   Send with no star   -> "Choose a star." under the stars; nothing is sent
//   Send works          -> the "Thank you" Message card
//   the link died meanwhile (a second tab sent it) -> the dead-link card for whatever it is now
"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/auth/buttons";
import { ScoreRow } from "@/components/ui/score-row";
import { StarsChoose } from "@/components/ui/star-rating";
import { AlreadyRatedCard, ExpiredCard, ReviewUnavailableCard, ThankYouCard, UnknownLinkCard } from "./review-cards";
import type { ReviewDead, ReviewOpen } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
const boxClass =
  "min-h-[44px] w-full rounded-button border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";

type Phase = { kind: "open" } | { kind: "sent" } | { kind: "dead"; dead: ReviewDead } | { kind: "unavailable" };

export function DeadReviewCard({ dead }: { dead: ReviewDead }) {
  if (dead.state === "used") return <AlreadyRatedCard jobReference={dead.jobReference} />;
  if (dead.state === "expired") return <ExpiredCard officePhone={dead.officePhone} />;
  return <UnknownLinkCard officePhone={dead.officePhone} />;
}

export function ReviewView({ token, read, presetRating }: { token: string; read: ReviewOpen; presetRating: number }) {
  const [phase, setPhase] = useState<Phase>({ kind: "open" });
  const [rating, setRating] = useState(presetRating);
  const [reviewText, setReviewText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [ratingError, setRatingError] = useState("");
  const [working, setWorking] = useState(false);

  async function send() {
    if (rating === 0) {
      setRatingError("Choose a star.");
      return;
    }
    setRatingError("");
    setWorking(true);
    try {
      const res = await fetch(`${apiUrl}/api/review/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText, recommendScore: score }),
      });
      const body = (await res.json()) as { error?: string; field?: string } & Partial<ReviewDead>;
      if (res.status === 200) {
        setPhase({ kind: "sent" });
      } else if (res.status === 400 && body.field === "rating") {
        setRatingError(body.error ?? "Choose a star.");
      } else if (res.status === 404 || res.status === 410) {
        setPhase({ kind: "dead", dead: body as ReviewDead });
      } else {
        setPhase({ kind: "unavailable" });
      }
    } catch {
      setPhase({ kind: "unavailable" });
    } finally {
      setWorking(false);
    }
  }

  if (phase.kind === "sent") return <ThankYouCard />;
  if (phase.kind === "dead") return <DeadReviewCard dead={phase.dead} />;
  if (phase.kind === "unavailable") return <ReviewUnavailableCard />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-page-title font-extrabold text-ink">How did {read.firstName} go?</h1>
        <p className="mt-1 text-small text-secondary-text" data-testid="review-intro">
          {read.trade} - {read.jobReference} - {read.finishedOn}
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4 md:p-5"
      >
        <div>
          <span className={`${labelClass} after:ml-0.5 after:text-brand-destructive after:content-['*']`}>Your rating</span>
          <StarsChoose value={rating} onChange={(n) => { setRating(n); setRatingError(""); }} label="Your rating" />
          {ratingError ? (
            <p role="alert" className="mt-[5px] text-xs text-brand-destructive">
              {ratingError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="review-text" className={labelClass}>
            Anything to add?
          </label>
          <textarea
            id="review-text"
            rows={3}
            placeholder="What went well, or what could be better."
            value={reviewText}
            maxLength={2000}
            onChange={(e) => setReviewText(e.target.value)}
            className={`${boxClass} resize-y`}
          />
        </div>

        <div>
          <span id="score-label" className={labelClass}>
            How likely are you to recommend us to a friend?
          </span>
          <ScoreRow value={score} onChange={setScore} label="How likely are you to recommend us to a friend?" />
        </div>

        <PrimaryButton type="submit" size="full" loading={working} loadingLabel="Sending...">
          Send
        </PrimaryButton>
      </form>
    </div>
  );
}
