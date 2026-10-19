// The job page -- Feature 4001, ops job queue and job detail.
// Architecture & Routing / Page inventory: `/ops/jobs/[ref]`, ops + owner --
// where the confirming call is captured. Reached from a queue row, or from
// the new-job-request email's link (opened logged out, the login gate shows
// first, then this job).
import { Suspense } from "react";
import { cookies } from "next/headers";
import { StatusTag } from "@/components/ui/status-tag";
import { Tag } from "@/components/ui/tag";
import { JobDetailView } from "@/components/jobs/job-detail";
import type { JobDetail } from "@/components/jobs/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const JOBS_CRUMB = { label: "Jobs", href: "/ops/jobs" };

export default async function JobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(ref)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <Container width="wide">
        <PageHeader
          title={ref}
          subtitle="No job has this reference."
          breadcrumb={JOBS_CRUMB}
        />
        <div className="rounded-card border border-hairline bg-surface p-5 text-sm text-secondary-text">
          Check the reference, or find the job from the queue by its customer code, name or phone.
        </div>
      </Container>
    );
  }
  if (res.status !== 200) return <LoadFailed />;
  const job = (await res.json()) as JobDetail;

  return (
    <Container width="wide">
      <PageHeader
        title={job.reference}
        subtitle={`Received ${job.receivedLabel} via ${job.source === "web" ? "the web form" : "phone"}`}
        tags={
          <>
            <StatusTag status={job.status} />
            {/* Feature 6007: Paid beside the job's own status once its invoice is paid. */}
            {job.invoice?.status === "paid" ? <Tag tone="success" testId="job-paid-tag">Paid</Tag> : null}
          </>
        }
        breadcrumb={JOBS_CRUMB}
      />
      <Suspense>
        <JobDetailView initial={job} />
      </Suspense>
    </Container>
  );
}
