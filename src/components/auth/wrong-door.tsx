// Wrong door -- Feature 1003, auth + roles (AC3, AC11).
//
// RBAC is server-side; this is only what the refusal looks like. Never a
// silent redirect (a bounce reads as a broken link) and never a bare 403 --
// confirmed live on the Portal Login Gate style reference, 31 Aug 2026.
import { GateShell } from "./gate-shell";
import { PrimaryLink } from "./buttons";
import { LogoutLink } from "./logout-link";
import { PORTAL_ROOTS } from "@/lib/portal-roots";
import type { SessionUser } from "@/lib/session";

export function WrongDoor({ user, portalName }: { user: SessionUser; portalName: string }) {
  const ownRoot = PORTAL_ROOTS[user.role];

  return (
    <GateShell>
      <h1 className="mb-0.5 font-heading text-base font-extrabold text-ink">Wrong portal</h1>
      <p className="mb-4 text-xs text-muted-text">You&apos;re logged in as {user.email}</p>
      <p className="mb-4 text-[13px] text-secondary-text">
        This login doesn&apos;t have access to the {portalName.toLowerCase()}.
      </p>
      <PrimaryLink href={ownRoot}>Go to your portal</PrimaryLink>
      <LogoutLink />
    </GateShell>
  );
}
