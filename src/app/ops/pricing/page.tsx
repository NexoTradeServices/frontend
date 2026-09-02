// Pricing catalog -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { ServiceTypeCatalog } from "@/components/pricing/service-type-catalog";
import type { ServiceTypeDto } from "@/components/pricing/service-type-form";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function PricingPage() {
  const user = await getSessionUser();
  if (!user) return <LoginGate portalName={PORTAL_NAME} />;
  // The pricing pen is owner-only -- ops has no access, not even read
  // (Data Model / ServiceType).
  if (user.role !== "owner") return <WrongDoor user={user} portalName="Pricing" />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/service-types`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName="Pricing" />;
  const serviceTypes = (await res.json()) as ServiceTypeDto[];

  return (
    <OpsShell
      user={user}
      active="pricing"
      title="Pricing"
      subtitle="The customer rates, service-level multipliers and prefilled enquiry options for every trade."
    >
      <ServiceTypeCatalog serviceTypes={serviceTypes} />
    </OpsShell>
  );
}
