// Shared shapes -- Feature 4001, ops job queue and job detail.
// Mirrors the backend's DTOs (backend/src/jobs/queue.ts and detail.ts).
// Every time label arrives already rendered in the right zone by the
// backend's time helper (plan decision 12) -- nothing here formats a time.
import type { JobStatus } from "@/components/ui/status-tag";
import type { PickedAddress } from "@/components/ui/places-field";

export type StatusFilter = "open" | "new" | "assigned" | "scheduled" | "in_progress" | "on_hold" | "closed";

export interface ContractorView {
  name: string;
  code: string;
  standing: string;
}

export interface QueueRow {
  reference: string;
  status: JobStatus;
  source: "web" | "phone";
  customerName: string;
  customerCode: string;
  trade: string;
  suburb: string;
  postcode: string;
  wantedDate: string;
  windowLabel: string;
  receivedLabel: string;
  waiting: string | null;
  noSiteAddress: boolean;
  closedLabel: string | null;
  contractor: ContractorView | null;
}

export type QueueCounts = Record<StatusFilter, number>;

export interface QueueResult {
  rows: QueueRow[];
  total: number;
  hasMore: boolean;
  counts: QueueCounts;
  updatedLabel: string;
}

export interface NoteView {
  id: string | null;
  type: string;
  note: string;
  atLabel: string;
  authorName: string;
  edited: boolean;
  editableForSeconds: number;
}

export interface JobDetail {
  reference: string;
  status: JobStatus;
  source: "web" | "phone";
  trade: string;
  suburb: string;
  postcode: string;
  wantedDate: string;
  windowLabel: string;
  receivedLabel: string;
  description: string | null;
  answers: string[];
  customer: {
    code: string;
    name: string;
    phone: string | null;
    email: string;
    billingAddress: PickedAddress | null;
  };
  siteAddress: PickedAddress | null;
  siteSameAsBilling: boolean;
  siteLocked: boolean;
  contractor: ContractorView | null;
  notes: NoteView[];
}

export interface ApiError {
  error: string;
  field?: string;
}

export const SOURCE_LABELS: Record<QueueRow["source"], string> = { web: "Web", phone: "Phone" };
