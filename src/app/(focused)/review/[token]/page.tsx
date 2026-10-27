// The review page -- Feature 6009, ratings and reviews.
// Architecture & Routing / Page inventory: `/review/<token>`, no login -- the token in the path is the
// permission (Passwordless capability links, ADR 0004). Read server-side, like `/approve/<token>`, so a
// dead link renders its reason on first paint. `?rating=1` to `?rating=5` (the stars in the email)
// opens it with that star already chosen.
import { Container } from "@/components/frame/container";
import { ReviewUnavailableCard } from "@/components/reviews/review-cards";
import { DeadReviewCard, ReviewView } from "@/components/reviews/review-view";
import type { ReviewRead } from "@/components/reviews/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { robots: { index: false, follow: false } };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rating?: string | string[] }>;
}) {
  const { token } = await params;
  const { rating } = await searchParams;
  const asked = Number(Array.isArray(rating) ? rating[0] : rating);
  const presetRating = Number.isInteger(asked) && asked >= 1 && asked <= 5 ? asked : 0;

  let read: ReviewRead | null = null;
  try {
    const res = await fetch(`${apiUrl}/api/review/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.status === 200 || res.status === 404 || res.status === 410) {
      read = (await res.json()) as ReviewRead;
    }
  } catch {
    read = null;
  }

  // Page map: the link page is Medium; a dead link is the Narrow message page.
  return (
    <Container width={read !== null && read.state === "open" ? "medium" : "narrow"}>
      {read === null ? (
        <ReviewUnavailableCard />
      ) : read.state === "open" ? (
        <ReviewView token={token} read={read} presetRating={presetRating} />
      ) : (
        <DeadReviewCard dead={read} />
      )}
    </Container>
  );
}
