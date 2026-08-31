// Customer portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/account`, login required (customer).
import { getSessionUser } from "@/lib/session";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalPlaceholder } from "@/components/auth/portal-placeholder";

const PORTAL_NAME = "Customer account";

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) return <LoginGate portalName={PORTAL_NAME} />;
  if (user.role !== "customer") return <WrongDoor user={user} portalName={PORTAL_NAME} />;
  return <PortalPlaceholder portalName={PORTAL_NAME} user={user} />;
}
