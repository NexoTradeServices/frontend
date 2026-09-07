// Contractors list -- Feature 2001, contractor onboarding (Mike's path).
// Architecture & Routing / Page inventory: `/ops/contractors`, ops + owner
// (decision 5 -- contractor management is ops work, unlike the pricing pen).
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { ContractorList } from "@/components/contractors/contractor-list";
import type { ContractorDto } from "@/components/contractors/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractors`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName="Contractors" displayName={displayName} />;
  const contractors = (await res.json()) as ContractorDto[];

  return (
    <OpsShell
      user={user}
      active="contractors"
      title="Contractors"
      subtitle="Everyone on the books. Click a row to open them. Not ready names what is missing, so nobody has to guess."
      displayName={displayName}
    >
      <Suspense>
        <ContractorList contractors={contractors} />
      </Suspense>
    </OpsShell>
  );
}
