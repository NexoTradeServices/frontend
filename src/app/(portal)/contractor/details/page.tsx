// The contractor's own My details page -- Feature 2005. The contractor comes from the session, never the URL.
import { cookies } from "next/headers";
import { ContractorDetails } from "@/components/contractor-details/contractor-details";
import type { DetailsDto } from "@/components/contractor-details/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorDetailsPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/details`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const details = (await res.json()) as DetailsDto;

  return (
    <Container width="medium">
      <PageHeader title="My details" />
      <ContractorDetails initial={details} />
    </Container>
  );
}
