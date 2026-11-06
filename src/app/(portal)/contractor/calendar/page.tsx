// The contractor's Calendar -- Feature 2004. Portal shell, Wide, a Record page: the Calendar day / week and the Month view.
import { cookies } from "next/headers";
import { ContractorCalendar } from "@/components/calendar/contractor-calendar";
import type { CalendarDto } from "@/components/availability/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { title: "Calendar" };

export default async function ContractorCalendarPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/calendar`, { headers: { cookie: cookieStore.toString() }, cache: "no-store" });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as CalendarDto;
  return (
    <Container width="wide">
      <PageHeader title="Calendar" />
      <ContractorCalendar base="/api/contractor" initial={initial} />
    </Container>
  );
}
