// The logged-in placeholder -- Feature 1003, auth + roles.
//
// Plan decision 6: behind each gate, 1003 ships only who is logged in, their
// role, and Log out. 2003 / 4001 / 6010 replace this with the real portal.
import { LogoutLink } from "./logout-link";
import { Wordmark } from "@/components/brand/wordmark";
import type { SessionUser } from "@/lib/session";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  customer: "Customer",
  contractor: "Contractor",
  ops: "Operations admin",
  owner: "Platform owner",
};

// `displayName` arrives as a prop, fetched by the caller ALONGSIDE
// getSessionUser (Promise.all) -- not fetched here, which would serialize
// two backend round trips into one render instead of running them in parallel.
export function PortalPlaceholder({
  portalName,
  user,
  displayName = null,
}: {
  portalName: string;
  user: SessionUser;
  displayName?: string | null;
}) {
  return (
    <div className="min-h-screen bg-ground">
      <div className="bg-ink px-4 py-3">
        <Wordmark name={displayName} />
      </div>
      <div className="mx-auto max-w-md px-5 py-10">
        <h1 className="mb-1 font-heading text-2xl font-black text-ink">{portalName}</h1>
        <p className="mb-6 text-sm text-secondary-text">
          Logged in as {user.name} ({user.email}) -- {ROLE_LABELS[user.role]}.
        </p>
        <LogoutLink />
      </div>
    </div>
  );
}
