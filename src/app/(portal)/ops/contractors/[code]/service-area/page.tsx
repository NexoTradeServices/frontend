// The Service area tab -- Feature 2002, service area builder. Appears on
// [code] only, never on /new (Record tabs: the surface cannot exist for a
// contractor not yet saved -- plan decision 12).
import { cookies } from "next/headers";
import { OpsServiceAreaPanel } from "@/components/contractors/ops-service-area-panel";
import type { ContractorDto } from "@/components/contractors/types";
import type { ServiceAreaDto } from "@/components/service-area/service-area";
import { Container } from "@/components/frame/container";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorServiceAreaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [contractorRes, areaRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/${code}/service-area`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200 || areaRes.status !== 200) {
    return <LoadFailed />;
  }
  const contractor = (await contractorRes.json()) as ContractorDto;
  const initial = (await areaRes.json()) as ServiceAreaDto;

  return (
    <Container width="medium">
      <OpsServiceAreaPanel contractor={contractor} initial={initial} />
    </Container>
  );
}
