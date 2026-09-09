// Contractor portal root -- Feature 2003, contractor dashboard.
// Architecture & Routing / Page inventory: "Dashboard (assigned jobs -- the
// day's work, no money; the readiness panel above them)".
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { ReadinessPanel } from "@/components/contractor-dashboard/readiness-panel";
import { JobCard } from "@/components/contractor-dashboard/job-card";
import { EmptyDashboard } from "@/components/contractor-dashboard/empty-state";
import type { DashboardDto } from "@/components/contractor-dashboard/types";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorDashboardPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/dashboard`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const dashboard = (await res.json()) as DashboardDto;

  return (
    <PortalShell
      user={user}
      active="dashboard"
      title="Dashboard"
      subtitle="Your work, soonest first."
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <ReadinessPanel ready={dashboard.ready} missing={dashboard.missing} />
      {dashboard.jobs.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <div className="flex flex-col gap-3">
          {dashboard.jobs.map((job) => (
            <JobCard key={job.reference} job={job} />
          ))}
        </div>
      )}
    </PortalShell>
  );
}
