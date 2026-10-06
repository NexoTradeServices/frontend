// The contractor agreement page -- Feature 2006, contractor agreement
// acceptance. Architecture & Routing / Page inventory: `/contractor/agreement`
// -- a Record page in the Portal shell, in no menu: it is reached from the
// dashboard's readiness row and the update email, never a gate. The agreement
// itself loads in the browser (AgreementPanel), so the page shell stays light.
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { AgreementPanel } from "@/components/agreement/agreement-panel";

const PORTAL_NAME = "Contractor portal";

export default async function ContractorAgreementPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  return (
    <PortalShell
      user={user}
      active="agreement"
      title="Contractor agreement"
      subtitle="Read it in your own time, then accept."
      displayName={displayName}
      breadcrumb={
        <Link href="/contractor" className="inline-flex min-h-11 items-center text-muted-text underline underline-offset-2">
          Back to dashboard
        </Link>
      }
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <AgreementPanel />
    </PortalShell>
  );
}
