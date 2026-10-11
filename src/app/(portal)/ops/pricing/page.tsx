// Pricing catalog -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { ServiceTypeCatalog } from "@/components/pricing/service-type-catalog";
import type { ServiceTypeDto } from "@/components/pricing/service-type-form";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { OwnerOnly } from "@/components/auth/owner-only";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function PricingPage() {
  const user = await getSessionUser();
  // The pricing pen is owner-only -- ops has no access, not even read
  // (Data Model / ServiceType); an ops login sees the Owner only card.
  if (user?.role !== "owner") return <OwnerOnly user={user} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/service-types`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const serviceTypes = (await res.json()) as ServiceTypeDto[];

  return (
    <Container width="medium">
      <PageHeader
        title="Pricing"
        subtitle="The customer rates, service-level multipliers and prefilled enquiry options for every trade."
      />
      <ServiceTypeCatalog serviceTypes={serviceTypes} />
    </Container>
  );
}
