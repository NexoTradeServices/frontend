// The Calendar tab on a contractor's record -- Feature 2004. The same screen as the contractor's own, opened by Mike or the owner.
import { cookies } from "next/headers";
import { ContractorCalendar } from "@/components/calendar/contractor-calendar";
import { ContractorRecordHeader } from "@/components/contractors/record-header";
import type { ContractorDto } from "@/components/contractors/types";
import type { CalendarDto } from "@/components/availability/types";
import { Container } from "@/components/frame/container";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function OpsContractorCalendarPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cookieStore = await cookies();
  const headers = { cookie: cookieStore.toString() };
  const [contractorRes, calendarRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/${code}/calendar`, { headers, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200 || calendarRes.status !== 200) return <LoadFailed />;
  const contractor = (await contractorRes.json()) as ContractorDto;
  const initial = (await calendarRes.json()) as CalendarDto;
  return (
    <Container width="wide">
      <ContractorRecordHeader contractor={contractor} activeTab="calendar" />
      <ContractorCalendar base={`/api/contractors/${code}`} initial={initial} />
    </Container>
  );
}
