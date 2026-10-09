// Receivables -- Feature 6002, Stripe payment and receivables.
// Architecture & Routing / Page inventory: `/ops/receivables`, ops + owner. Portal
// shell, List page (Pages / Which template each kind of page uses).
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { Receivables } from "@/components/receivables/receivables";
import type { ReceivablesResult } from "@/components/receivables/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ReceivablesPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/receivables`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const initial = (await res.json()) as ReceivablesResult;

  return (
    <PortalShell
      user={user}
      active="receivables"
      title="Receivables"
      subtitle="Every invoice still owed - most overdue first."
      displayName={displayName}
    >
      <Receivables initial={initial} />
    </PortalShell>
  );
}
