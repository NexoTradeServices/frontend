// Public holidays page -- Feature 1020 (moved off the Settings card at the owner's UAT).
// Architecture & Routing / Page inventory: `/ops/settings/holidays`, owner only; a Form page under Settings.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { PublicHolidaysCard } from "@/components/settings/public-holidays-card";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { OwnerOnly } from "@/components/auth/owner-only";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function OpsPublicHolidaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user?.role !== "owner") return <OwnerOnly user={user} />;

  const query = await searchParams;
  const pick = (key: string): string | undefined => (typeof query[key] === "string" ? query[key] : undefined);
  const holidayYear = Number(pick("holidayYear"));

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/settings`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const settings = (await res.json()) as { timezone: string };

  return (
    <Container width="medium">
      <PageHeader
        title="Public holidays"
        subtitle="The business is closed on these days, state by state."
        breadcrumb={{ label: "Settings", href: "/ops/settings" }}
      />
      <PublicHolidaysCard
        key={`${pick("holidayState") ?? "WA"}-${String(holidayYear)}`}
        timezone={settings.timezone}
        initialState={pick("holidayState")}
        initialYear={Number.isInteger(holidayYear) && holidayYear >= 2000 ? holidayYear : undefined}
      />
    </Container>
  );
}
