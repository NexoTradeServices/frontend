// Operations portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/ops`, login required (ops; the owner
// role unlocks the owner-only sections inside it -- both share this door).
//
// Feature 4001, plan decision 11: the queue is ops' dashboard, so an ops or
// owner session is sent straight to /ops/jobs, server-side. Logged out, the
// login gate shows here as before; its refresh after a good login re-runs
// this page, which then lands on the queue. The wrong-door card is untouched.
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";

const PORTAL_NAME = "Operations portal";

export default async function OpsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);

  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }
  redirect("/ops/jobs");
}
