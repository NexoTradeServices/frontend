// The Refunds list's read -- Feature 6006 (GET /api/refunds).
export interface RefundRow {
  reference: string;
  dateLabel: string;
  customerName: string;
  jobReference: string;
  invoiceReference: string;
  /** Whole cents. */
  amount: number;
  status: "pending" | "succeeded" | "failed";
  madeBy: string;
}

export interface RefundsResult {
  rows: RefundRow[];
  total: number;
  page: number;
  pageCount: number;
  from: number;
  to: number;
}
