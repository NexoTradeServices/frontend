// Shared shapes -- Feature 5001, contractor job screen.
// Mirrors the backend's DTOs (backend/src/contractors/job-routes.ts, jobs/visit.ts).
import type { JobStatus } from "@/components/ui/status-tag";
import type { ReadOnlyPhoto } from "@/components/ui/photo-gallery";

export interface EntryDto {
  date: string;
  start: string;
  end: string;
  note: string;
}

export interface PartDto {
  name: string;
  description: string;
  qty: number;
  /** Whole cents. */
  unitPrice: number;
  lineTotal: number;
  receiptAttachmentId: string | null;
  receipt: { fileName: string; thumbnailUrl: string; fullUrl: string } | null;
}

export interface UnpaidPaymentDto {
  /** Whole cents, GST-inclusive: the customer's total. */
  amount: number;
  paid: false;
  /** Null while Stripe has not answered. */
  payLinkUrl: string | null;
  messages: "sent" | "sending" | "failed";
}

/** Feature 6002: once paid the card stays, with the total and nothing more to collect. */
export interface PaidPaymentDto {
  amount: number;
  paid: true;
}

export type PaymentDto = UnpaidPaymentDto | PaidPaymentDto;

export interface ContractorJobDto {
  reference: string;
  jobStatus: JobStatus;
  assignmentStatus: "accepted" | "in_progress" | "completed";
  customerName: string;
  trade: string;
  suburb: string;
  postcode: string;
  slotLabel: string | null;
  addressLine: string;
  contactLine: string;
  contactIsSiteContact: boolean;
  description: string | null;
  answers: string[];
  photos: ReadOnlyPhoto[];
  instructions: { authorFirstName: string; dateLabel: string; note: string }[];
  timeEntries: EntryDto[];
  completionNotes: string;
  parts: PartDto[];
  /**
   * Feature 6001: what Bob can tell the customer in front of him -- the total she pays, whether
   * the invoice email and text have gone, and the pay link as a QR. Never his own pay. Null when
   * there is nothing to pay.
   */
  payment: PaymentDto | null;
  billedHours: number;
  returnVisitMinimumMinutes: number;
  /** Whole cents -- the cap per part line. */
  maxContractorPartAmount: number;
  frozen: boolean;
  canOnSite: boolean;
  timezone: string;
  /** Feature 6004: the original's reference when this job is a callback, else null. */
  callbackOn: string | null;
  /** Feature 6004: the original's notes, then each earlier finished callback's; empty once his booking is over. */
  earlierNotes: EarlierNotesDto[];
  /** Feature 6004: his pick on a callback; null until he picks. */
  callbackChargeable: boolean | null;
}

/** Feature 6004: an earlier job's notes (the original, or a finished callback), read-only for the contractor. */
export interface EarlierNotesDto {
  kind: "original" | "callback";
  reference: string;
  description: string;
  finished: string;
  workSummary: string;
  parts: { name: string; description: string; qty: number }[];
}

export interface ApiError {
  error: string;
  field?: string;
}

/** Bob's own wording for the status tag; its colour still comes from the job's status. */
export function contractorStatusLabel(status: JobStatus): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "in_progress") return "In progress";
  if (status === "on_hold") return "On hold";
  if (status === "completed") return "Completed";
  return status;
}
