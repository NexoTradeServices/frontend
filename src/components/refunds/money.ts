// Money as the refund screens write it -- Feature 6006: "$540", "$1,320", "$12.50".
// Mirrors backend/src/refunds/money.ts.
export function refundMoney(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** What the person typed ("540", "540.50", "$1,320") as whole cents, or null when it is not an amount. */
export function typedDollarsToCents(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Cents as the Money field shows them: "540.00". */
export function centsToField(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const REFUND_TAGS: Record<"pending" | "succeeded" | "failed", { label: string; pair: string }> = {
  pending: { label: "Pending", pair: "bg-warning-bg text-brand-warning" },
  succeeded: { label: "Refunded", pair: "bg-success-bg text-brand-success" },
  failed: { label: "Failed", pair: "bg-error-bg text-brand-destructive" },
};
