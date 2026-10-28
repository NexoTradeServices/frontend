// Jobs -- Feature 6010, customer portal. Portal shell, Wide, List page.
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { JobsList, type JobRow } from "@/components/account/lists";
import { accountGet } from "@/lib/account-api";

export const metadata = { title: "Your jobs" };

export default async function AccountJobsPage() {
  const { data } = await accountGet<{ rows: JobRow[]; total: number; hasMore: boolean }>("/jobs?limit=50");
  if (data === null) return <LoadFailed />;
  return (
    <Container width="wide">
      <PageHeader title="Jobs" subtitle="Everything you have asked us to do." />
      <JobsList initial={data} />
    </Container>
  );
}
