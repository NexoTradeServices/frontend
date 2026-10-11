// The contractor's Settlements page -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/contractor/payouts`, contractor only. Portal
// shell, List page with Record cards (Pages / Which template each kind of page uses).
import { cookies } from "next/headers";
import { ContractorSettlements } from "@/components/settlements/contractor-settlements";
import type { ContractorList } from "@/components/settlements/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorSettlementsPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/settlements`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as ContractorList;

  return (
    <Container width="wide">
      <PageHeader
        title="Payouts"
      />
      <ContractorSettlements initial={initial} />
    </Container>
  );
}
