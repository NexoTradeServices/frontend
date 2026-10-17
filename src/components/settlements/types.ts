// Shared shapes -- Feature 6003, settlement run. Mirror the backend's reads:
// backend/src/settlements/invoice-view.ts (the invoice), lists.ts (the lists),
// service.ts (the approve link's states).

export type PayLineWorking =
  | {
      kind: "visit";
      calloutRate: number;
      extraHours: number;
      standardRate: number;
      extraTotal: number;
      multiplier: number;
    }
  | { kind: "no_show" };

export interface PayLine {
  jobReference: string;
  /** "Wed 14 Oct" */
  day: string;
  trade: string;
  hours: number | null;
  /** time and a half: the line carries the code and the table a legend */
  weekend: boolean;
  amount: number;
  working: PayLineWorking;
}

export interface InvoiceView {
  reference: string;
  status: "draft" | "approved" | "paid" | "superseded";
  heading: "Tax Invoice" | "Invoice" | "Draft invoice";
  gstRegistered: boolean;
  gstNotRecorded: boolean;
  from: { name: string; businessName: string | null; abn: string | null };
  to: { name: string; abn: string | null; address: string | null };
  period: { start: string; end: string; label: string };
  dateLabel: string;
  weekendMultiplier: number;
  lines: PayLine[];
  /** Feature 6007: `label` is the line as it prints ("Pay adjustment - ..." / "Correction - JOB-1042: ...") */
  adjustments: { reason: string; label: string; kind: "adjustment" | "correction"; amount: number; jobReference: string | null }[];
  subtotal: number;
  gst: number | null;
  materials: { jobReference: string; name: string; amount: number }[];
  materialsTotal: number;
  total: number;
  /** the next payout shown as the invoice it will become: no number, no approval */
  preview?: boolean;
  /** Feature 6007: a deduction the run cannot take yet, on the next payout only */
  stillToDeduct?: { amount: number; jobReferences: string[] } | null;
}

// ---- the approve link -----------------------------------------------------

export interface ApproveOpen {
  state: "open";
  firstName: string;
  payDay: string;
  officePhone: string;
  invoice: InvoiceView;
}

export type ApproveDead =
  | { state: "replaced"; officePhone: string }
  | { state: "approved"; reference: string; approvedLabel: string; payDay: string; paid: boolean; officePhone: string }
  | { state: "unknown"; officePhone: string };

export type ApproveRead = ApproveOpen | ApproveDead;

// ---- the contractor's pages -------------------------------------------------

export interface NextPayout {
  amount: number;
  jobs: number;
  adjustments: number;
  stillToDeduct: { amount: number; jobReferences: string[] } | null;
  plusGst: boolean;
  payDay: string;
  invoicedOn: string;
  period: string;
  total: number;
}

export interface ContractorCard {
  reference: string;
  status: "draft" | "approved" | "paid";
  tag: string;
  period: string;
  amount: number;
  dateLine: string;
}

export interface ContractorList {
  nextPayout: NextPayout;
  settlements: ContractorCard[];
  nextCursor: string | null;
}

export interface ContractorDetail {
  invoice: InvoiceView;
  payDay: string;
  invoicedOn?: string;
  paidLabel: string | null;
}

// ---- the ops screen ------------------------------------------------------------

export type OpsView = "ready" | "awaiting" | "upcoming" | "paid";

export interface OpsRow {
  reference: string;
  contractor: { code: string; name: string; firstName: string };
  period: string;
  jobs: number;
  amount: number;
  bsb: string | null;
  account: string | null;
  approvedLabel: string | null;
  madeLabel: string;
  paidLabel: string | null;
  paidBy: string | null;
  gstNotRecorded: boolean;
}

export interface UpcomingRow {
  contractor: { code: string; name: string; firstName: string };
  jobs: number;
  /** Feature 6007: the visits' labour waiting, cents */
  work: number;
  /** the plus and minus lines waiting, net, cents (negative = a deduction) */
  adjustments: number;
  /** what the run will pay, cents */
  payout: number;
  invoicedOn: string;
  paidOn: string;
}

export interface OpsList {
  view: OpsView;
  facts: { readyCount: number; readyTotal: number; payDay: string };
  counts: Record<OpsView, number>;
  rows: OpsRow[];
  upcoming: UpcomingRow[];
  nextCursor: string | null;
}

export interface OpsDetail {
  invoice: InvoiceView;
  contractor: { code: string; name: string };
  amount: number;
  payDay: string;
}

// ---- Feature 6007: the Add pay adjustment dialog --------------------------------

export interface AdjustmentContractor {
  id: string;
  code: string;
  name: string;
  firstName: string;
}

export interface AdjustmentLanding {
  landing: "draft" | "approved" | "next_run";
  sentence: string;
}
