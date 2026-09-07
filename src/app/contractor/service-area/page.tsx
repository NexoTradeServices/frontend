// Contractor's own Service area page -- Feature 2002, plan decision 1: the
// contractor comes from the session, never the URL. The contractor portal
// shell's first built entry (plan decision 2).
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { ServiceArea, type ServiceAreaDto } from "@/components/service-area/service-area";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorServiceAreaPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/service-area`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const initial = (await res.json()) as ServiceAreaDto;

  return (
    <PortalShell
      user={user}
      active="service-area"
      title="Your service area"
      subtitle="Where you take jobs. Whole postcodes: keep the ones you serve, cross off the rest."
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <ServiceArea putUrl="/api/contractor/service-area" initial={initial} mode="contractor" />
    </PortalShell>
  );
}
