// Shapes -- Feature 6007, correct & reissue. Mirror backend/src/invoices/correct.ts.

export type InvoiceKind = "visit" | "no_show" | "zero" | "void";

export interface CorrectionForm {
  reference: string;
  customerName: string;
  customerFirstName: string;
  trade: string;
  timezone: string;
  contractorFirstName: string;
  kind: InvoiceKind;
  invoice: { reference: string; status: "sent" | "paid" | "void"; amount: number; isZeroDollar: boolean };
  /** null on a no-show: there is no time on site */
  timeEntries: { date: string; start: string; end: string; note: string }[] | null;
  prices: {
    callout: { label: string; was: number } | null;
    hourly: { label: string; was: number } | null;
    parts: { id: string; label: string; was: number }[];
  } | null;
  contractor: { firstName: string; pay: number; place: "unswept" | "draft" | "frozen" };
  refundedSoFar: number;
}

export interface FieldError {
  field: string;
  error: string;
}

export interface WhatHappens {
  customer: { label: string; from: number; to: number; action: "reissue" | "refund" | "none"; sentence: string };
  contractor: { label: string; from: number; to: number; sentence: string } | null;
}

export type PreviewResult = ({ ok: true } & WhatHappens) | { errors: FieldError[] };

export interface CorrectionDone {
  toast: string;
  newInvoiceReference: string | null;
  refundReference: string | null;
}
