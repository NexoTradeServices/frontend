// Shared shapes -- Feature 2003, contractor dashboard + rates screen.
// Mirrors the backend's DTOs (backend/src/contractors/dashboard-routes.ts).

export type JobStatus = "new" | "assigned" | "scheduled" | "in_progress" | "on_hold" | "completed" | "cancelled";

export interface JobCardDto {
  reference: string;
  jobStatus: JobStatus;
  customerName: string;
  trade: string;
  suburb: string;
  slotLabel: string | null;
}

export type ReadinessPen = "own" | "mikes";

export interface ReadinessItemDto {
  key: string;
  copy: string;
  pen: ReadinessPen;
  route: string | null;
  blocking: boolean;
}

export interface DashboardDto {
  ready: boolean;
  missing: ReadinessItemDto[];
  jobs: JobCardDto[];
}

export interface RateSpecialtyDto {
  trade: string;
  status: "active" | "suspended";
  licenceNumber: string;
  licenceExpiry: string; // yyyy-mm-dd
  normal: { callout: number; standard: number };
  weekend: { callout: number; standard: number };
}

export interface RatesDto {
  specialties: RateSpecialtyDto[];
}

/** Job Lifecycle & Statuses -- the card's own status tag, one shape per state that can reach the dashboard (2003's AC1 filter). */
export function jobStatusTagLabel(status: JobStatus): string {
  if (status === "assigned") return "Awaiting your answer";
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "In progress";
  if (status === "on_hold") return "On hold";
  return status;
}

export function jobStatusTagClasses(status: JobStatus): string {
  const base = "inline-block shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase";
  if (status === "assigned") return `${base} bg-status-new-bg text-status-new`;
  if (status === "scheduled") return `${base} bg-success-bg text-brand-success`;
  if (status === "in_progress") return `${base} bg-warning-bg text-brand-warning`;
  if (status === "on_hold") return `${base} bg-status-on-hold-bg text-status-on-hold`;
  return `${base} bg-ground text-muted-text`;
}

/** Whole cents -> "$200.00" -- the rates ladder's own formatting, GST plays no part here (this is the contractor's own pay, never a customer price). */
export function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
