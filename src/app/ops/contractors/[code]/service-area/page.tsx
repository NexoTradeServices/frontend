// The Service area tab -- Feature 2002, service area builder. Appears on
// [code] only, never on /new (Record tabs: the surface cannot exist for a
// contractor not yet saved -- plan decision 12).
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { OpsServiceAreaPanel } from "@/components/contractors/ops-service-area-panel";
import type { ContractorDto } from "@/components/contractors/types";
import type { ServiceAreaDto } from "@/components/service-area/service-area";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorServiceAreaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [contractorRes, areaRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/${code}/service-area`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200 || areaRes.status !== 200) {
    return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  }
  const contractor = (await contractorRes.json()) as ContractorDto;
  const initial = (await areaRes.json()) as ServiceAreaDto;

  return (
    <PortalShell
      user={user}
      active="contractors"
      title="Contractors"
      subtitle="Everyone on the books. Click a row to open them. Not ready names what is missing, so nobody has to guess."
      displayName={displayName}
    >
      <OpsServiceAreaPanel contractor={contractor} initial={initial} />
    </PortalShell>
  );
}
