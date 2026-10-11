// The job queue -- Feature 4001, ops job queue and job detail.
// Architecture & Routing / Page inventory: `/ops/jobs`, ops + owner -- the
// portal root `/ops` lands here after login.
import { cookies } from "next/headers";
import { JobQueue } from "@/components/jobs/job-queue";
import type { QueueResult } from "@/components/jobs/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function JobsPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/jobs?status=open&limit=50`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as QueueResult;

  return (
    <Container width="wide">
      <PageHeader
        title="Jobs"
        subtitle="Open work - new enquiries first, oldest waiting at the top."
      />
      <JobQueue initial={initial} />
    </Container>
  );
}
