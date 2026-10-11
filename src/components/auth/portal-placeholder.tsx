// The logged-in placeholder -- Feature 1003, auth + roles.
//
// Plan decision 6: behind each gate, 1003 ships only who is logged in and
// their role. 2003 / 4001 / 6010 replace this with the real portal. Feature
// 1018: it sits inside the Portal frame like every portal page, so its own
// ink bar and its own Log out are gone -- the Sidebar and the Menu drawer
// carry both -- and the title is the one Page header.
import { PageHeader } from "@/components/ui/page-header";
import type { SessionUser } from "@/lib/session";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  customer: "Customer",
  contractor: "Contractor",
  ops: "Operations admin",
  owner: "Platform owner",
};

export function PortalPlaceholder({ portalName, user }: { portalName: string; user: SessionUser }) {
  return (
    <PageHeader
      title={portalName}
      subtitle={`Logged in as ${user.name} (${user.email}) -- ${ROLE_LABELS[user.role]}.`}
    />
  );
}
