// The shared status tag -- Feature 4001, BKLG-022.
//
// frontend-conventions.md, Foundations / Colors (Status palette): one colour
// per lifecycle status, identical everywhere -- queue, job page, contractor
// dashboard, later the calendar and track page. Each status reads its ONE
// token pair from globals.css; no screen styles a status of its own. A
// screen may word the tag for its reader (Bob's dashboard says "Awaiting
// your answer" for assigned) -- the colour still comes from the status.
export type JobStatus = "new" | "assigned" | "scheduled" | "in_progress" | "on_hold" | "completed" | "cancelled";

const PAIRS: Record<JobStatus, string> = {
  new: "bg-status-new-bg text-status-new",
  assigned: "bg-status-assigned-bg text-status-assigned",
  scheduled: "bg-status-scheduled-bg text-status-scheduled",
  in_progress: "bg-status-in-progress-bg text-status-in-progress",
  on_hold: "bg-status-on-hold-bg text-status-on-hold",
  completed: "bg-status-completed-bg text-status-completed",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  new: "New",
  assigned: "Assigned",
  scheduled: "Scheduled",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusTag({ status, label }: { status: JobStatus; label?: string }) {
  return (
    <span
      data-status={status}
      className={`inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase ${PAIRS[status]}`}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
