// How a visit's dates, times and money read -- Feature 5001.
// Times are the JOB's own wall clock (Data Model / Time), never the viewer's.

/** "08:07" -> "8:07am". */
export function formatClock(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  const meridiem = hour < 12 ? "am" : "pm";
  return `${String(hour % 12 === 0 ? 12 : hour % 12)}:${match[2] ?? "00"}${meridiem}`;
}

/** "2026-10-07" -> "7 Oct 2026". */
export function formatVisitDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

/** The job's calendar date and clock right now, as the date and time boxes hold them. */
export function nowInZone(zone: string, now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

/** Whole cents -> the Money field's "45.00". */
export function centsToDollarsText(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** The Money field's text -> whole cents; null when it is not a positive amount. */
export function dollarsTextToCents(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}
