// The dispatch page -- Feature 4002, dispatch to assignment.
// Architecture & Routing / Page inventory: `/ops/jobs/[ref]/dispatch`, ops +
// owner, reached from the job page's Contractor card.
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { StatusTag, type JobStatus } from "@/components/ui/status-tag";
import { DispatchView } from "@/components/jobs/dispatch/dispatch-view";
import type { DispatchFacts } from "@/components/jobs/dispatch/types";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function Breadcrumb({ reference, reschedule = false }: { reference: string; reschedule?: boolean }) {
  return (
    <>
      <Link href="/ops/jobs" className="inline-flex min-h-11 min-w-11 items-center text-muted-text underline underline-offset-2">
        Jobs
      </Link>
      {" / "}
      <Link
        href={`/ops/jobs/${encodeURIComponent(reference)}`}
        className="inline-flex min-h-11 min-w-11 items-center text-muted-text underline underline-offset-2"
      >
        {reference}
      </Link>
      {reschedule ? " / Reschedule" : " / Dispatch"}
    </>
  );
}

export default async function DispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { ref } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "ops" && user.role !== "owner") {
    return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  }

  const cookieStore = await cookies();
  const reschedule = (await searchParams).mode === "reschedule";
  const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(ref)}/dispatch${reschedule ? "?mode=reschedule" : ""}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <PortalShell
        user={user}
        active="jobs"
        title={`Dispatch ${ref}`}
        subtitle="No job has this reference."
        breadcrumb={<Breadcrumb reference={ref} />}
        displayName={displayName}
      >
        <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-secondary-text">
          Check the reference, or find the job from the queue.
        </div>
      </PortalShell>
    );
  }
  if (res.status === 409 && reschedule) {
    // Not booked any more (answered elsewhere, taken off, cancelled): say so, and offer the way back.
    return (
      <PortalShell
        user={user}
        active="jobs"
        title={`Reschedule ${ref}`}
        subtitle="This job has no booking to move."
        breadcrumb={<Breadcrumb reference={ref} reschedule />}
        displayName={displayName}
      >
        <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-secondary-text">
          <Link href={`/ops/jobs/${encodeURIComponent(ref)}`} className="underline underline-offset-2">
            Back to {ref}
          </Link>
        </div>
      </PortalShell>
    );
  }
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const facts = (await res.json()) as DispatchFacts;
  const isReschedule = facts.mode === "reschedule" && facts.contractor !== undefined;

  return (
    <PortalShell
      user={user}
      active="jobs"
      title={`${isReschedule ? "Reschedule" : "Dispatch"} ${facts.reference}`}
      titleAside={<StatusTag status={facts.status as JobStatus} />}
      breadcrumb={<Breadcrumb reference={facts.reference} reschedule={isReschedule} />}
      subtitle={
        isReschedule
          ? `Pick ${facts.contractor?.firstName ?? ""}'s new time. ${facts.contractor?.firstName ?? ""} is asked to accept it again.`
          : `${facts.trade} - ${facts.suburb} - ${facts.customerName}`
      }
      displayName={displayName}
    >
      <DispatchView initial={facts} />
    </PortalShell>
  );
}
