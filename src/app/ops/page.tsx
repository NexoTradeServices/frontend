// Operations portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/ops`, login required (ops; the owner
// role unlocks the owner-only sections inside it -- both share this door).
import { getSessionUser } from "@/lib/session";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalPlaceholder } from "@/components/auth/portal-placeholder";

const PORTAL_NAME = "Operations portal";

export default async function OpsPage() {
  const user = await getSessionUser();

  if (!user) return <LoginGate portalName={PORTAL_NAME} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} />;
  }
  return <PortalPlaceholder portalName={PORTAL_NAME} user={user} />;
}
