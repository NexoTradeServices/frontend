// Settlements -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/ops/payouts`, ops + owner. Portal shell, List page
// (Pages / Which template each kind of page uses). Designed at Desktop first; Mobile best effort.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { OpsSettlements } from "@/components/settlements/ops-settlements";
import type { OpsList } from "@/components/settlements/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function SettlementsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/settlements?view=ready`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const initial = (await res.json()) as OpsList;

  return (
    <PortalShell
      user={user}
      active="settlements"
      title="Payouts"
      subtitle="Pay the approved invoices on pay day, then mark each one paid."
      displayName={displayName}
    >
      <OpsSettlements initial={initial} />
    </PortalShell>
  );
}
