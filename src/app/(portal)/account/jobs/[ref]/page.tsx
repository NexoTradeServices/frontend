// Job detail -- Feature 6010, customer portal. Portal shell, Wide, Record page.
// Breadcrumb "< Jobs", the reference as title, the status tag; cards: Job details (the facts, then the description and
// Additional questions), Invoices, Your review (absent before the job is done; "No review yet." once done and unrated).
import Link from "next/link";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { StarsShown } from "@/components/ui/star-rating";
import { Card, Fact, InvoiceStatusTag, JobStatusTag, NotFoundCard } from "@/components/account/parts";
import { accountGet } from "@/lib/account-api";

interface JobDetailDto {
  reference: string;
  trade: string;
  suburb: string;
  postcode: string;
  status: string;
  when: string;
  tradie: string | null;
  jobSite: string | null;
  description: string | null;
  answers: string[];
  invoices: { reference: string; status: string }[];
  done: boolean;
  review: { rating: number; reviewText: string | null; recommendScore: number | null } | null;
}

export default async function AccountJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { status, data: job } = await accountGet<JobDetailDto>(`/jobs/${encodeURIComponent(ref)}`);
  if (status === 404) {
    return (
      <Container width="narrow">
        <NotFoundCard />
      </Container>
    );
  }
  if (job === null) return <LoadFailed />;

  return (
    <Container width="wide">
      <PageHeader breadcrumb={{ label: "Jobs", href: "/account/jobs" }} title={job.reference} tags={<JobStatusTag word={job.status} />} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div>
          <Card title="Job details">
            <div className="grid grid-cols-1 gap-x-4.5 gap-y-3 sm:grid-cols-3">
              <Fact label="Trade">{job.trade}</Fact>
              <Fact label="Suburb">
                {job.suburb} {job.postcode}
              </Fact>
              <Fact label="When">
                <span className="tabular-nums">{job.when}</span>
              </Fact>
              {job.tradie !== null ? <Fact label="Tradie">{job.tradie}</Fact> : null}
              {job.jobSite !== null ? (
                <div className="sm:col-span-2">
                  <Fact label="Job site">{job.jobSite}</Fact>
                </div>
              ) : null}
            </div>
            <div className="mt-4 border-t border-hairline pt-4">
              <Fact label="Description" wide>
                <p className="max-w-[62ch] whitespace-pre-wrap font-normal text-secondary-text">{job.description ?? "-"}</p>
              </Fact>
              {job.answers.length > 0 ? (
                <div className="mt-3">
                  <span className="block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase">Additional questions</span>
                  <ul className="list-disc pl-4.5 text-secondary-text">
                    {job.answers.map((answer) => (
                      <li key={answer}>{answer}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
        <Card title="Invoices">
          {job.invoices.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {job.invoices.map((invoice) => (
                <li key={invoice.reference} className="flex items-center gap-2.5">
                  <Link href={`/account/invoices/${encodeURIComponent(invoice.reference)}`} className="inline-flex min-h-11 items-center font-heading font-extrabold text-ink underline underline-offset-2">
                    {invoice.reference}
                  </Link>
                  <InvoiceStatusTag word={invoice.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-muted-text">No invoice yet.</p>
          )}
        </Card>
        {job.done ? (
          <Card title="Your review">
            {job.review !== null ? (
              <div className="flex flex-col gap-1.5" data-testid="your-review">
                <div className="flex items-center gap-2">
                  <StarsShown value={job.review.rating} />
                  <span className="font-semibold tabular-nums text-ink">{job.review.rating} / 5</span>
                </div>
                {job.review.reviewText ? <p className="max-w-[62ch] whitespace-pre-wrap text-secondary-text">{job.review.reviewText}</p> : null}
              </div>
            ) : (
              <p className="text-small text-muted-text">No review yet.</p>
            )}
          </Card>
        ) : null}
      </div>
    </Container>
  );
}
