// The Correct & reissue page -- Feature 6007.
// Architecture & Routing / Page inventory: `/ops/jobs/[ref]/correct`, ops + owner, reached from the job
// page's Invoice card. Portal shell, Medium container, Form page (Pages / Which layout each kind of page
// takes: a record edited as a form).
import { cookies } from "next/headers";
import { CorrectView } from "@/components/jobs/correct/correct-view";
import type { CorrectionForm } from "@/components/jobs/correct/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

// The one way back is the job this page acts on, so the single Breadcrumb link names the job.
function jobCrumb(reference: string) {
  return { label: reference, href: `/ops/jobs/${encodeURIComponent(reference)}` };
}

export default async function CorrectPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(ref)}/correct`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 409) {
    const refused = res.status === 409 ? ((await res.json()) as { error?: string }).error : undefined;
    return (
      <Container width="medium">
        <PageHeader
          title="Correct & reissue"
          subtitle={res.status === 404 ? "No job has this reference." : "This job cannot be corrected."}
          breadcrumb={jobCrumb(ref)}
        />
        <div className="rounded-card border border-hairline bg-surface p-5 text-sm text-secondary-text">
          {refused ?? "Check the reference, or find the job from the queue."}
        </div>
      </Container>
    );
  }
  if (res.status !== 200) return <LoadFailed />;
  const form = (await res.json()) as CorrectionForm;

  const state = form.invoice.status === "paid" ? "paid" : form.invoice.status === "void" ? "voided" : "unpaid";
  return (
    <Container width="medium">
      <PageHeader
        title="Correct & reissue"
        subtitle={`${form.customerName} - ${form.trade} - ${form.invoice.reference} (${state})`}
        breadcrumb={jobCrumb(form.reference)}
      />
      <CorrectView form={form} />
    </Container>
  );
}
