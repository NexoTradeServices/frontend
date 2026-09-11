// The job page -- Feature 4001, ops job queue and job detail.
// Architecture & Routing / Page inventory: `/ops/jobs/[ref]`, ops + owner --
// where the confirming call is captured. Reached from a queue row, or from
// the new-job-request email's link (opened logged out, the login gate shows
// first, then this job).
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { StatusTag } from "@/components/ui/status-tag";
import { JobDetailView } from "@/components/jobs/job-detail";
import type { JobDetail } from "@/components/jobs/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function Breadcrumb({ reference }: { reference: string }) {
  return (
    <>
      <Link
        href="/ops/jobs"
        className="inline-flex min-h-11 min-w-11 items-center text-muted-text underline underline-offset-2"
      >
        Jobs
      </Link>
      / {reference}
    </>
  );
}

export default async function JobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(ref)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <PortalShell
        user={user}
        active="jobs"
        title={ref}
        subtitle="No job has this reference."
        breadcrumb={<Breadcrumb reference={ref} />}
        displayName={displayName}
      >
        <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-secondary-text">
          Check the reference, or find the job from the queue by its customer code, name or phone.
        </div>
      </PortalShell>
    );
  }
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const job = (await res.json()) as JobDetail;

  return (
    <PortalShell
      user={user}
      active="jobs"
      title={job.reference}
      titleAside={<StatusTag status={job.status} />}
      breadcrumb={<Breadcrumb reference={job.reference} />}
      subtitle={`${job.customer.name} - ${job.trade} in ${job.suburb} ${job.postcode} - received ${job.receivedLabel} via ${
        job.source === "web" ? "the web form" : "phone"
      }`}
      displayName={displayName}
    >
      <JobDetailView initial={job} />
    </PortalShell>
  );
}
