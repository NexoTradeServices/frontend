// Operations portal root -- Feature 1003, auth + roles; the shell it now
// renders inside is Feature 1006's (the first build of the ops portal shell
// every /ops screen lives in -- this root is one of them).
// Architecture & Routing / The doors: `/ops`, login required (ops; the owner
// role unlocks the owner-only sections inside it -- both share this door).
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";

const PORTAL_NAME = "Operations portal";

const ROLE_LABELS = { ops: "Operations admin", owner: "Platform owner" } as const;

export default async function OpsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);

  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }
  return (
    <OpsShell
      user={user}
      active=""
      title={PORTAL_NAME}
      subtitle={`Logged in as ${user.name} (${user.email}) -- ${ROLE_LABELS[user.role]}.`}
      displayName={displayName}
    >
      <p className="text-sm text-secondary-text">
        No pages are open here yet -- each nav item lights up as its own feature ships.
      </p>
    </OpsShell>
  );
}
