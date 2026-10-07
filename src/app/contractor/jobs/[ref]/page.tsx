// The contractor's job screen -- Feature 5001.
// Architecture & Routing / Page inventory: `/contractor/jobs/[ref]`, contractor
// only, opened from a dashboard card once he has accepted the job. A job that
// is not his own assignment reads as not found, never as a hint that it exists.
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { StatusTag } from "@/components/ui/status-tag";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { ContractorJobScreen } from "@/components/contractor-job/contractor-job-screen";
import { contractorStatusLabel, type ContractorJobDto } from "@/components/contractor-job/types";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function BackToDashboard() {
  return (
    <Link href="/contractor" className="inline-flex min-h-11 min-w-11 items-center text-muted-text underline underline-offset-2">
      Back to dashboard
    </Link>
  );
}

export default async function ContractorJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(ref)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <PortalShell
        user={user}
        active="dashboard"
        title={ref}
        subtitle="This job isn't one of yours."
        breadcrumb={<BackToDashboard />}
        displayName={displayName}
        navItems={CONTRACTOR_NAV_ITEMS}
      >
        <div className="rounded-[10px] border border-hairline bg-surface p-4 text-sm text-secondary-text md:p-5">
          Open your jobs from the dashboard.
        </div>
      </PortalShell>
    );
  }
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const job = (await res.json()) as ContractorJobDto;

  return (
    <PortalShell
      user={user}
      active="dashboard"
      title={job.reference}
      titleAside={<StatusTag status={job.jobStatus} label={contractorStatusLabel(job.jobStatus)} />}
      breadcrumb={<BackToDashboard />}
      subtitle={`${job.trade} - ${job.customerName}, ${job.suburb} ${job.postcode}`}
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <ContractorJobScreen initial={job} />
    </PortalShell>
  );
}
