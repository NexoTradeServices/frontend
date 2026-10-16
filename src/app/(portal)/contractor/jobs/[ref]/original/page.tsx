// The original job a callback is about -- Feature 6004, callbacks and no-shows.
// Pages / Page map: `/contractor/jobs/[ref]/original`, contractor only, Portal shell, Medium container.
// `[ref]` is HIS callback; the page reads the original it was raised on, read-only: what was wrong,
// when it was finished, what was done and the parts - never prices, time on site or who did it.
// Not his callback, or his booking no longer open, reads as the page-could-not-be-read Message page.
import { cookies } from "next/headers";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import type { OriginalJobDto } from "@/components/contractor-job/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>
      <div className="mt-[5px] font-semibold text-ink">{children}</div>
    </div>
  );
}

export default async function OriginalJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(ref)}/original`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const original = (await res.json()) as OriginalJobDto;

  return (
    <Container width="medium">
      <PageHeader title={original.reference} breadcrumb={{ label: ref, href: `/contractor/jobs/${encodeURIComponent(ref)}` }} />
      <section className="rounded-card border border-hairline bg-surface p-4 md:p-5" data-testid="original-job">
        <h2 className="font-heading text-base font-extrabold text-ink">Last time</h2>
        <div className="mt-3 flex flex-col gap-3.5">
          <Fact label="Problem">
            <p className="max-w-[62ch] font-normal whitespace-pre-wrap">{original.description || "-"}</p>
          </Fact>
          <Fact label="Finished">
            <span className="font-normal tabular-nums">{original.finished || "-"}</span>
          </Fact>
          <Fact label="Work summary">
            <p className="max-w-[62ch] font-normal whitespace-pre-wrap">{original.workSummary || "-"}</p>
          </Fact>
          <Fact label="Parts">
            {original.parts.length === 0 ? (
              <p className="font-normal text-muted-text">No parts.</p>
            ) : (
              <ul className="font-normal">
                {original.parts.map((part, index) => (
                  <li key={index}>
                    {part.name}
                    {part.description ? ` - ${part.description}` : ""} x{part.qty}
                  </li>
                ))}
              </ul>
            )}
          </Fact>
        </div>
      </section>
    </Container>
  );
}
