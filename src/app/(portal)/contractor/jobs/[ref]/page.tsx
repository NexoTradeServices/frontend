// The contractor's job screen -- Feature 5001.
// Architecture & Routing / Page inventory: `/contractor/jobs/[ref]`, contractor
// only, opened from a dashboard card once he has accepted the job. A job that
// is not his own assignment reads as not found, never as a hint that it exists.
import { cookies } from "next/headers";
import { StatusTag } from "@/components/ui/status-tag";
import { ContractorJobScreen } from "@/components/contractor-job/contractor-job-screen";
import { contractorStatusLabel, type ContractorJobDto } from "@/components/contractor-job/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const DASHBOARD_CRUMB = { label: "Dashboard", href: "/contractor" };

export default async function ContractorJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(ref)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <Container width="wide">
        <PageHeader
          title={ref}
          subtitle="This job isn't one of yours."
          breadcrumb={DASHBOARD_CRUMB}
        />
        <div className="rounded-[10px] border border-hairline bg-surface p-4 text-sm text-secondary-text md:p-5">
          Open your jobs from the dashboard.
        </div>
      </Container>
    );
  }
  if (res.status !== 200) return <LoadFailed />;
  const job = (await res.json()) as ContractorJobDto;

  return (
    <Container width="wide">
      <PageHeader
        title={job.reference}
        subtitle={`${job.trade} - ${job.customerName}, ${job.suburb} ${job.postcode}`}
        tags={<StatusTag status={job.jobStatus} label={contractorStatusLabel(job.jobStatus)} />}
        breadcrumb={DASHBOARD_CRUMB}
      />
      <ContractorJobScreen initial={job} />
    </Container>
  );
}
