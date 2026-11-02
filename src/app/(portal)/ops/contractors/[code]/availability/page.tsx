// The Availability tab on a contractor's record -- Feature 2004. Mike and the owner see the same grid the contractor does
// and can set it with his yes on the phone.
import { cookies } from "next/headers";
import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { ContractorRecordHeader } from "@/components/contractors/record-header";
import type { ContractorDto } from "@/components/contractors/types";
import type { WeekDto } from "@/components/availability/types";
import { Container } from "@/components/frame/container";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function OpsContractorAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const week = typeof query["week"] === "string" ? `?week=${query["week"]}` : "";
  const cookieStore = await cookies();
  const headers = { cookie: cookieStore.toString() };
  const [contractorRes, weekRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/${code}/availability${week}`, { headers, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200 || weekRes.status !== 200) return <LoadFailed />;
  const contractor = (await contractorRes.json()) as ContractorDto;
  const initial = (await weekRes.json()) as WeekDto;
  return (
    <Container width="wide">
      <ContractorRecordHeader contractor={contractor} activeTab="availability" />
      <AvailabilityGrid
        key={initial.week}
        base={`/api/contractors/${code}`}
        initial={initial}
        calendarHref={`/ops/contractors/${code}/calendar`}
      />
    </Container>
  );
}
