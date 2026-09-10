// Whole-cent-integer money, formatted for a person -- Feature 3001. Mirrors
// backend/src/enquiries/money.ts so the estimate shown here and the rate
// frozen on the job never disagree (plan decision 5).
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2)}`;
}

/** Saturday or Sunday, read off a plain YYYY-MM-DD calendar date -- no zone conversion needed (it carries no time). */
export function isWeekendDate(yyyyMmDd: string): boolean {
  const day = new Date(`${yyyyMmDd}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function todayYmd(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** "Wednesday" -- the day name for the Price step's summary row. */
export function formatDayName(yyyyMmDd: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "long", timeZone: "UTC" }).format(new Date(`${yyyyMmDd}T00:00:00Z`));
}

/** "9 Sep 2026" -- a friendly date for the Price step's summary row. */
export function formatFriendlyDate(yyyyMmDd: string): string {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${yyyyMmDd}T00:00:00Z`),
  );
}
