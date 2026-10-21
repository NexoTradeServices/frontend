// The Reviews tab -- Feature 6009, ratings and reviews. Appears on [code] only, never on /new (Record
// tabs: the surface cannot exist for a contractor not yet saved).
import { cookies } from "next/headers";
import { ContractorReviewsPanel } from "@/components/contractors/contractor-reviews-panel";
import type { ContractorDto } from "@/components/contractors/types";
import type { ContractorReviews } from "@/components/reviews/types";
import { Container } from "@/components/frame/container";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorReviewsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [contractorRes, reviewsRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/${code}/reviews`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200 || reviewsRes.status !== 200) {
    return <LoadFailed />;
  }
  const contractor = (await contractorRes.json()) as ContractorDto;
  const initial = (await reviewsRes.json()) as ContractorReviews;

  return (
    <Container width="medium">
      <ContractorReviewsPanel contractor={contractor} initial={initial} />
    </Container>
  );
}
