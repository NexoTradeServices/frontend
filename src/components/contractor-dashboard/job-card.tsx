// Bob's dashboard job card -- Feature 2003. Card anatomy (frontend
// conventions): reference + status tag on top, then the customer, then key
// facts. Feature 5001: an accepted or in-progress card is the whole tap target
// and opens its job screen (Record card); a card still waiting for his answer
// stays flat -- it is answered from the link in his text and email.
// Feature 4001, BKLG-022: the tag is the one shared status tag, so assigned
// reads in its own violet pair here exactly as on the ops queue.
// Feature 6007: a completed job stays as a card with the warning Tag "Completed - awaiting payment"
// until its invoice is paid, and opens his job screen at its Payment card.
import Link from "next/link";
import { StatusTag } from "@/components/ui/status-tag";
import { Tag } from "@/components/ui/tag";
import { jobStatusTagLabel, type JobCardDto } from "./types";

export function JobCard({ job }: { job: JobCardDto }) {
  const body = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2.5">
        <span className="font-heading text-sm font-extrabold text-ink">{job.reference}</span>
        {job.awaitingPayment ? (
          <Tag tone="warning" testId="awaiting-payment-tag">
            Completed - awaiting payment
          </Tag>
        ) : (
          <StatusTag status={job.jobStatus} label={jobStatusTagLabel(job.jobStatus)} />
        )}
      </div>
      <p className="mb-0.5 font-heading text-base font-bold text-ink">{job.customerName}</p>
      <p className="text-sm text-secondary-text">
        {job.trade} &middot; {job.suburb}
      </p>
      {/* AC3: on hold with no return date carries no slot -- a plain line in its place. A completed job has no slot to show. */}
      {job.awaitingPayment ? null : <p className="text-sm tabular-nums text-secondary-text">{job.slotLabel ?? "No return date yet"}</p>}
    </>
  );
  const cardClass = "block rounded-card border border-hairline bg-surface p-3.5";
  if (!job.opens) return <div className={cardClass}>{body}</div>;
  return (
    <Link
      href={`/contractor/jobs/${encodeURIComponent(job.reference)}${job.awaitingPayment ? "#payment" : ""}`}
      className={`${cardClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
    >
      {body}
    </Link>
  );
}
