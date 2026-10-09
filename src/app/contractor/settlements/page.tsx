// The contractor's Settlements page -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/contractor/settlements`, contractor only. Portal
// shell, List page with Record cards (Pages / Which template each kind of page uses).
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { ContractorSettlements } from "@/components/settlements/contractor-settlements";
import type { ContractorList } from "@/components/settlements/types";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorSettlementsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/settlements`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const initial = (await res.json()) as ContractorList;

  return (
    <PortalShell
      user={user}
      active="settlements"
      title="Settlements"
      subtitle="What you've been paid, and what's coming."
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <ContractorSettlements initial={initial} />
    </PortalShell>
  );
}
