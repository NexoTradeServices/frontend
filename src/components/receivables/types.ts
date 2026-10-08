// The Receivables page's read -- Feature 6002 (GET /api/receivables).
export interface ReceivableRow {
  invoiceReference: string;
  jobReference: string;
  billedTo: { name: string; businessName: string | null };
  phone: string | null;
  /** Whole cents, GST-inclusive. */
  amount: number;
  dueLabel: string;
  due: { kind: "overdue" | "today" | "later"; label: string };
  waitingForPayLink: boolean;
}

export interface ReceivablesResult {
  count: number;
  /** Whole cents. */
  total: number;
  rows: ReceivableRow[];
  nextCursor: string | null;
}
