// Add a trade -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only
// (plan decision 3: create is included -- "a catalog the owner cannot
// extend without a developer is not a catalog").
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { ServiceTypeForm, type ServiceTypeDto } from "@/components/pricing/service-type-form";

const PORTAL_NAME = "Operations portal";

const BLANK: ServiceTypeDto = {
  id: "",
  trade: "",
  customerCalloutRate: 0,
  customerStandardRate: 0,
  serviceLevelMultipliers: { normal: 1.0, emergency: 1.5, weekend: 1.5 },
  prefilledFields: [],
};

export default async function NewServiceTypePage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "owner") return <WrongDoor user={user} portalName="Pricing" displayName={displayName} />;

  return (
    <OpsShell
      user={user}
      active="pricing"
      title="Add a trade"
      subtitle="Set its customer rates before it goes live."
      displayName={displayName}
    >
      <ServiceTypeForm mode="create" initial={BLANK} />
    </OpsShell>
  );
}
