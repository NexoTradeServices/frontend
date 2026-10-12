// Contractor's own Rates screen -- Feature 2003, plan decision (Contractor
// pay calculation): "the ladder is disclosed up front, in-app" -- both tier
// rates at both levels, per trade. No third (emergency) row anywhere: his
// side of the arithmetic never reads `Job.serviceLevel` (AC9).
import { cookies } from "next/headers";
import { RatesCard } from "@/components/contractor-dashboard/rates-card";
import type { RatesDto } from "@/components/contractor-dashboard/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorRatesPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/rates`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const rates = (await res.json()) as RatesDto;

  return (
    <Container width="medium">
      <PageHeader
        title="Rates"
        subtitle="What we pay you, per trade."
      />
      <div className="flex flex-col gap-3">
        {rates.specialties.map((specialty) => (
          <RatesCard key={specialty.trade} specialty={specialty} />
        ))}
      </div>
      <p className="mt-3 border-t border-hairline pt-2.5 text-small text-secondary-text">
        Call-out covers turning up and your first hour, once per job. Every hour after that is the hourly rate, in
        15-minute blocks.
      </p>
      <p className="text-small text-secondary-text">Weekend work pays you one and a half times.</p>
    </Container>
  );
}
