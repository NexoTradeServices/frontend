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
  /** Feature 4003: waiting at new behind a decline -- who declined, and his note. */
  declined: { by: string; note: string | null } | null;
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

export interface SiteContact {
  name: string;
  phone: string;
  email: string | null;
}

/** Feature 4008: one row of the job page's Messages card, already worded by the backend. */
export interface MessageView {
  id: string;
  to: string;
  channel: "Email" | "Text";
  whenLabel: string;
  what: string;
  status: "queued" | "sent" | "delivered" | "failed";
  statusLabel: string;
  error: string | null;
}

/** Feature 4003: one earlier booking, already worded by the backend. */
export interface EarlierBooking {
  contractorName: string;
  contractorCode: string;
  what: string;
  whenLabel: string;
  slotLabel: string | null;
  note: string | null;
}

/** Feature 5001: the shown assignment's visit -- time entries ops may fix until Complete, then the frozen record. */
export interface VisitView {
  editable: boolean;
  completed: boolean;
  timezone: string;
  timeEntries: { date: string; start: string; end: string; note: string }[];
  billedHours: number;
  completionNotes: string | null;
  /** Whole cents. */
  parts: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
}

/** Feature 6001: the invoice Complete issued, read from its frozen rows. Money is whole cents. */
export interface InvoiceView {
  reference: string;
  status: "sent" | "paid" | "void";
  /** Sent, not zero-dollar, and Stripe has not answered yet. */
  waitingForPayLink: boolean;
  payLinkUrl: string | null;
  /** Resend invoice and Copy pay link are shown only when this is true. */
  canResend: boolean;
  /** Feature 6002: Check payment with Stripe is shown only when this is true. */
  canCheckPayment: boolean;
  /** Feature 6002: "15 Oct 2026, card" once paid; null otherwise. */
  paidLabel: string | null;
  billedTo: { name: string; businessName: string | null; address: PickedAddress | null };
  issuedLabel: string;
  dueLabel: string;
  lines: { kind: "labour" | "part" | "callout"; description: string; qty: number; unitPrice: number; lineTotal: number }[];
  amount: number;
  gstApplied: boolean;
  gstAmount: number;
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
  /** Feature 3003: the customer's enquiry photos, oldest first. */
  photos: { fileName: string; thumbnailUrl: string; fullUrl: string }[];
  customer: {
    code: string;
    name: string;
    businessName: string | null;
    phone: string | null;
    email: string;
    billingAddress: PickedAddress | null;
  };
  siteAddress: PickedAddress | null;
  siteSameAsBilling: boolean;
  siteLocked: boolean;
  /** Feature 4008: who lets the contractor in; null = the customer is the contact. */
  siteContact: SiteContact | null;
  /** Completed or cancelled -- the site contact is read-only. */
  closed: boolean;
  contractor: ContractorView | null;
  /** Feature 5001: null until the contractor has accepted. */
  visit: VisitView | null;
  /** Feature 6001: null until Complete has issued one. */
  invoice: InvoiceView | null;
  /** Feature 4003: every booking on the job but the one in play, newest first. */
  earlierBookings: EarlierBooking[];
  /** Feature 4006: which of Reschedule, Reassign and Cancel job the page offers. */
  actions: { reschedule: boolean; takeOff: boolean; cancel: boolean };
  /** Feature 4006: set once the job is cancelled. */
  cancelled: { reasonLabel: string; note: string | null; byName: string; atLabel: string } | null;
  /** Feature 4002, AC29: the level and its price, once the job is dispatched. */
  serviceLevel: "normal" | "weekend" | "emergency" | null;
  priceLine: string | null;
  /** Feature 4002, AC1/AC2: the job page's own Dispatch button. */
  canDispatch: boolean;
  dispatchBlockedReason: string | null;
  notes: NoteView[];
  messages: MessageView[];
}

export interface ApiError {
  error: string;
  field?: string;
}

export const SOURCE_LABELS: Record<QueueRow["source"], string> = { web: "Web", phone: "Phone" };
