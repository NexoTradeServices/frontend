// Wrong door -- Feature 1003, auth + roles (AC3, AC11).
//
// RBAC is server-side; this is only what the refusal looks like. Never a
// silent redirect (a bounce reads as a broken link) and never a bare 403 --
// confirmed live on the Portal Login Gate style reference, 31 Aug 2026.
import { MessageCard } from "@/components/ui/message-card";
import { LogoutLink } from "./logout-link";
import { PORTAL_ROOTS } from "@/lib/portal-roots";
import type { SessionUser } from "@/lib/session";

// Feature 9001: the one shared Message card. Feature 1018: drawn by the Portal shell's login gate, in the Focused
// frame, in the Narrow container -- not by each page.
export function WrongDoor({ user, portalName }: { user: SessionUser; portalName: string }) {
  const ownRoot = PORTAL_ROOTS[user.role];

  return (
    <MessageCard title="Wrong portal" primary={{ label: "Go to your portal", href: ownRoot }} link={<LogoutLink />}>
      You&apos;re logged in as {user.email}. This login doesn&apos;t have access to the {portalName.toLowerCase()}.
    </MessageCard>
  );
}
