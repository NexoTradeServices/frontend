// Edit a trade -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { ServiceTypeForm, type ServiceTypeDto } from "@/components/pricing/service-type-form";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function EditServiceTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "owner") return <WrongDoor user={user} portalName="Pricing" displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/service-types/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName="Pricing" displayName={displayName} />;
  const serviceType = (await res.json()) as ServiceTypeDto;

  return (
    <OpsShell
      user={user}
      active="pricing"
      title={serviceType.trade}
      subtitle="Customer rates, service-level multipliers and prefilled enquiry options for this trade."
      displayName={displayName}
    >
      <ServiceTypeForm mode="edit" initial={serviceType} />
    </OpsShell>
  );
}
