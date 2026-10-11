// Contractor portal root -- Feature 2003, contractor dashboard.
// Architecture & Routing / Page inventory: "Dashboard (assigned jobs -- the
// day's work, no money; the readiness panel above them)".
import { cookies } from "next/headers";
import { ReadinessPanel } from "@/components/contractor-dashboard/readiness-panel";
import { JobCard } from "@/components/contractor-dashboard/job-card";
import { EmptyDashboard } from "@/components/contractor-dashboard/empty-state";
import type { DashboardDto } from "@/components/contractor-dashboard/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorDashboardPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/dashboard`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const dashboard = (await res.json()) as DashboardDto;

  return (
    <Container width="wide">
      <PageHeader
        title="Dashboard"
        subtitle="Your work, soonest first."
      />
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
    </Container>
  );
}
