// The dispatch page -- Feature 4002, dispatch to assignment.
// Architecture & Routing / Page inventory: `/ops/jobs/[ref]/dispatch`, ops +
// owner, reached from the job page's Contractor card.
import Link from "next/link";
import { cookies } from "next/headers";
import { StatusTag, type JobStatus } from "@/components/ui/status-tag";
import { DispatchView } from "@/components/jobs/dispatch/dispatch-view";
import type { DispatchFacts } from "@/components/jobs/dispatch/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

// The one way back is the job this page acts on (the page has no other link
// to it), so the single Breadcrumb link names the job, not the list.
function jobCrumb(reference: string) {
  return { label: reference, href: `/ops/jobs/${encodeURIComponent(reference)}` };
}

export default async function DispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { ref } = await params;

  const cookieStore = await cookies();
  const reschedule = (await searchParams).mode === "reschedule";
  const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(ref)}/dispatch${reschedule ? "?mode=reschedule" : ""}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <Container width="wide">
        <PageHeader
          title={`Dispatch ${ref}`}
          subtitle="No job has this reference."
          breadcrumb={jobCrumb(ref)}
        />
        <div className="rounded-card border border-hairline bg-surface p-5 text-sm text-secondary-text">
          Check the reference, or find the job from the queue.
        </div>
      </Container>
    );
  }
  if (res.status === 409 && reschedule) {
    // Not booked any more (answered elsewhere, taken off, cancelled): say so, and offer the way back.
    return (
      <Container width="wide">
        <PageHeader
          title={`Reschedule ${ref}`}
          subtitle="This job has no booking to move."
          breadcrumb={jobCrumb(ref)}
        />
        <div className="rounded-card border border-hairline bg-surface p-5 text-sm text-secondary-text">
          <Link href={`/ops/jobs/${encodeURIComponent(ref)}`} className="underline underline-offset-2">
            Back to {ref}
          </Link>
        </div>
      </Container>
    );
  }
  if (res.status !== 200) return <LoadFailed />;
  const facts = (await res.json()) as DispatchFacts;
  const isReschedule = facts.mode === "reschedule" && facts.contractor !== undefined;

  return (
    <Container width="wide">
      <PageHeader
        title={`${isReschedule ? "Reschedule" : "Dispatch"} ${facts.reference}`}
        subtitle={
          isReschedule
            ? `Pick ${facts.contractor?.firstName ?? ""}'s new time. ${facts.contractor?.firstName ?? ""} is asked to accept it again.`
            : `${facts.trade} - ${facts.suburb} - ${facts.customerName}`
        }
        tags={<StatusTag status={facts.status as JobStatus} />}
        breadcrumb={jobCrumb(facts.reference)}
      />
      <DispatchView initial={facts} />
    </Container>
  );
}
