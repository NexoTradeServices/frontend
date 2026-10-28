// Shared shapes -- Feature 6009, ratings and reviews. Mirror the backend's reads:
// backend/src/reviews/service.ts (the review link's states), backend/src/jobs/detail.ts (ReviewView),
// backend/src/jobs/customer-rating.ts (reviewsGiven, wouldRecommend).

export interface ReviewOpen {
  state: "open";
  /** Bob's first name. */
  firstName: string;
  /** "Plumbing" */
  trade: string;
  jobReference: string;
  /** "14 Oct 2026" */
  finishedOn: string;
  officePhone: string;
  /** Feature 3004: has the customer chosen a password -- the footer offer reads it. */
  account: ReviewAccount;
}

/** Feature 3004. */
export type ReviewAccount = "guest" | "has_login";

export type ReviewDead =
  | { state: "used"; jobReference: string; officePhone: string; account: ReviewAccount }
  | { state: "expired"; jobReference: string; officePhone: string; account: ReviewAccount }
  | { state: "unknown"; officePhone: string; account: ReviewAccount };

export type ReviewRead = ReviewOpen | ReviewDead;

export interface ReviewView {
  rating: number;
  reviewText: string | null;
  recommendScore: number | null;
  customerName: string;
  createdAt: string;
  /** "16 Oct 2026" */
  createdLabel: string;
}

export interface ContractorReviewRow {
  id: string;
  createdAt: string;
  /** "16 Oct 2026" */
  createdLabel: string;
  jobReference: string;
  rating: number;
  reviewText: string | null;
}

export interface ContractorReviews {
  average: number | null;
  count: number;
  reviews: ContractorReviewRow[];
  nextCursor: string | null;
}
