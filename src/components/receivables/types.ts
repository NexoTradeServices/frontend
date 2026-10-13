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
  /** Feature 6008: reminders sent so far and the latest one's date ("9 Oct 2026"). */
  reminders: { sent: 0 | 1 | 2; lastLabel: string | null };
  /** Feature 6008: both reminders are out -- it is the operator's turn to ring. */
  yourTurn: boolean;
}

export interface ReceivablesResult {
  count: number;
  /** Whole cents. */
  total: number;
  rows: ReceivableRow[];
  nextCursor: string | null;
}
