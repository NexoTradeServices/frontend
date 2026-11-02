// The contractor's Availability -- Feature 2004. Portal shell, Wide, a Record page holding the Availability grid.
import { cookies } from "next/headers";
import { AvailabilityGrid } from "@/components/availability/availability-grid";
import type { WeekDto } from "@/components/availability/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { title: "Availability" };

export default async function ContractorAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const week = typeof query["week"] === "string" ? `?week=${query["week"]}` : "";
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/availability${week}`, { headers: { cookie: cookieStore.toString() }, cache: "no-store" });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as WeekDto;
  return (
    <Container width="wide">
      <PageHeader title="Availability" subtitle="The times you can work. Booked jobs stay as they are." />
      <AvailabilityGrid key={initial.week} base="/api/contractor" initial={initial} calendarHref="/contractor/calendar" />
    </Container>
  );
}
