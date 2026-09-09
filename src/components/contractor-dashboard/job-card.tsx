// Bob's dashboard job card -- Feature 2003. Card anatomy (frontend
// conventions): reference + status tag on top, then the customer, then key
// facts. Cards render flat -- the job screen is 5001; 2003 builds no tap-through.
import { jobStatusTagClasses, jobStatusTagLabel, type JobCardDto } from "./types";

export function JobCard({ job }: { job: JobCardDto }) {
  return (
    <div className="rounded-[9px] border border-hairline bg-surface p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2.5">
        <span className="font-heading text-sm font-extrabold text-ink">{job.reference}</span>
        <span className={jobStatusTagClasses(job.jobStatus)}>{jobStatusTagLabel(job.jobStatus)}</span>
      </div>
      <p className="mb-0.5 font-heading text-base font-bold text-ink">{job.customerName}</p>
      <p className="text-sm text-secondary-text">
        {job.trade} &middot; {job.suburb}
      </p>
      {/* AC3: on hold with no return date carries no slot -- a plain line in its place. */}
      <p className="text-sm tabular-nums text-secondary-text">{job.slotLabel ?? "No return date yet"}</p>
    </div>
  );
}
