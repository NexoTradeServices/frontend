// Contractor portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/contractor`, login required (contractor).
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalPlaceholder } from "@/components/auth/portal-placeholder";

const PORTAL_NAME = "Contractor portal";

export default async function ContractorPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);

  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  return <PortalPlaceholder portalName={PORTAL_NAME} user={user} displayName={displayName} />;
}
