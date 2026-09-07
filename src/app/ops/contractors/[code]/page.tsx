// The contractor page (Details tab) -- Feature 2001, contractor onboarding
// (Mike's path). The Service area tab is 2002's -- not built here (plan.md
// Scope / Out); the tab strip carries only Details.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { ContractorForm } from "@/components/contractors/contractor-form";
import type { ContractorDto } from "@/components/contractors/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorRecordPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const [contractorRes, tradesRes] = await Promise.all([
    fetch(`${apiUrl}/api/contractors/${code}`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
    fetch(`${apiUrl}/api/contractors/trade-options`, { headers: { cookie: cookieHeader }, cache: "no-store" }),
  ]);
  if (contractorRes.status !== 200) return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  const contractor = (await contractorRes.json()) as ContractorDto;
  const tradeOptions = tradesRes.status === 200 ? ((await tradesRes.json()) as { trades: string[] }).trades : [];

  return (
    <OpsShell
      user={user}
      active="contractors"
      title="Contractors"
      subtitle="Everyone on the books. Click a row to open them. Not ready names what is missing, so nobody has to guess."
      displayName={displayName}
    >
      <ContractorForm mode="edit" initial={contractor} tradeOptions={tradeOptions} />
    </OpsShell>
  );
}
