// Contractor's own Rates screen -- Feature 2003, plan decision (Contractor
// pay calculation): "the ladder is disclosed up front, in-app" -- both tier
// rates at both levels, per trade. No third (emergency) row anywhere: his
// side of the arithmetic never reads `Job.serviceLevel` (AC9).
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { RatesCard } from "@/components/contractor-dashboard/rates-card";
import type { RatesDto } from "@/components/contractor-dashboard/types";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorRatesPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/rates`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const rates = (await res.json()) as RatesDto;

  return (
    <PortalShell
      user={user}
      active="rates"
      title="Rates"
      subtitle="What we pay you, per trade."
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <div className="flex flex-col gap-3">
        {rates.specialties.map((specialty) => (
          <RatesCard key={specialty.trade} specialty={specialty} />
        ))}
      </div>
      <p className="mt-3 border-t border-hairline pt-2.5 text-[13px] text-secondary-text">
        Call-out covers turning up and your first hour, once per job. Every hour after that is the hourly rate, in
        15-minute blocks.
      </p>
      <p className="text-[13px] text-secondary-text">Weekend work pays you one and a half times.</p>
    </PortalShell>
  );
}
