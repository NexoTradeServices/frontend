// The contractor page (Details tab) -- Feature 2001, contractor onboarding
// (Mike's path). The Service area tab is 2002's -- not built here (plan.md
// Scope / Out); the tab strip carries only Details.
import { cookies } from "next/headers";
import { ContractorForm } from "@/components/contractors/contractor-form";
import type { ContractorDto } from "@/components/contractors/types";
import { Container } from "@/components/frame/container";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorRecordPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [contractorRes, tradesRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/trade-options`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200) return <LoadFailed />;
  const contractor = (await contractorRes.json()) as ContractorDto;
  const tradeOptions = tradesRes.status === 200 ? ((await tradesRes.json()) as { trades: string[] }).trades : [];

  return (
    <Container width="medium">
      <ContractorForm mode="edit" initial={contractor} tradeOptions={tradeOptions} />
    </Container>
  );
}
