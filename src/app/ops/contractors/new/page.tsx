// Add a contractor -- Feature 2001, contractor onboarding (Mike's path).
// Two pages, one form (plan decision 1): this and [code]/page.tsx render
// the same ContractorForm, blank or filled.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { ContractorForm } from "@/components/contractors/contractor-form";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function NewContractorPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractors/trade-options`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  const tradeOptions = res.status === 200 ? ((await res.json()) as { trades: string[] }).trades : [];

  return (
    <PortalShell
      user={user}
      active="contractors"
      title="Contractors"
      subtitle="Everyone on the books. Click a row to open them. Not ready names what is missing, so nobody has to guess."
      displayName={displayName}
    >
      <ContractorForm mode="create" initial={null} tradeOptions={tradeOptions} />
    </PortalShell>
  );
}
