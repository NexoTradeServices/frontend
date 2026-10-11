// Settlements -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/ops/payouts`, ops + owner. Portal shell, List page
// (Pages / Which template each kind of page uses). Designed at Desktop first; Mobile best effort.
import { cookies } from "next/headers";
import { OpsSettlements } from "@/components/settlements/ops-settlements";
import type { OpsList } from "@/components/settlements/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function SettlementsPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/settlements?view=ready`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as OpsList;

  return (
    <Container width="wide">
      <PageHeader
        title="Payouts"
        subtitle="Pay the approved invoices on pay day, then mark each one paid."
      />
      <OpsSettlements initial={initial} />
    </Container>
  );
}
