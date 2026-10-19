// Money as the Correct & reissue page writes it -- always with cents: "$555.00", "$1,250.00".
// Mirrors money2 in backend/src/invoices/correct.ts.
export function money2(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
