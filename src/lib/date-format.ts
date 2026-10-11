// The one date writer on screens -- Feature 9001; frontend-conventions / Organisms /
// Lists and tables / Formats. The same words as the backend's (`backend/src/time/index.ts`):
//
//   formatDate            9 Sep 2026
//   formatDateWithDay     Wed 14 Oct (this year) / Wed 14 Oct 2025 (any other year)
//   formatDateTime        9 Sep 2026, 10:14am
//   weekdayName           Monday
//
// Month names are fixed here, never the ICU's ("Sept"), and a date is never numbers.
// A plain `YYYY-MM-DD` carries no zone and is read as stored (UTC). A moment is read in
// the zone the caller names -- the job's or the business's, never the viewer's; a caller
// with no zone to hand gets the device's own, as it always did.

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

interface Parts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

const PLAIN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A plain date, or a moment read in `zone` (the device's own when none is given). */
function partsOf(value: string | Date, zone?: string): Parts | null {
  if (typeof value === "string") {
    const match = PLAIN.exec(value);
    if (match) {
      const utc = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(utc.getTime())) return null;
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        weekday: utc.getUTCDay(),
        hour: 0,
        minute: 0,
      };
    }
  }
  const moment = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(moment.getTime())) return null;
  const found = new Intl.DateTimeFormat("en-AU", {
    ...(zone === undefined ? {} : { timeZone: zone }),
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(moment);
  const num = (type: string): number => Number(found.find((part) => part.type === type)?.value ?? "0");
  const weekdayText = found.find((part) => part.type === "weekday")?.value ?? "";
  const weekday = WEEKDAY_NAMES.findIndex((name) => weekdayText.startsWith(name));
  return { year: num("year"), month: num("month"), day: num("day"), weekday: Math.max(weekday, 0), hour: num("hour"), minute: num("minute") };
}

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** "9 Sep 2026"; what it cannot read comes back as given. */
export function formatDate(value: string | Date, zone?: string): string {
  const p = partsOf(value, zone);
  if (p === null) return String(value);
  return `${String(p.day)} ${monthName(p.month)} ${String(p.year)}`;
}

/** "Wed 14 Oct" this year, "Wed 14 Oct 2025" any other; "this year" is `now`'s in the same zone. */
export function formatDateWithDay(value: string | Date, zone?: string, now: Date = new Date()): string {
  const p = partsOf(value, zone);
  if (p === null) return String(value);
  const base = `${WEEKDAY_NAMES[p.weekday] ?? ""} ${String(p.day)} ${monthName(p.month)}`;
  const thisYear = typeof value === "string" && PLAIN.test(value) ? partsOf(now, "UTC")?.year : partsOf(now, zone)?.year;
  return p.year === thisYear ? base : `${base} ${String(p.year)}`;
}

/** "9 Sep 2026, 10:14am" */
export function formatDateTime(value: string | Date, zone?: string): string {
  const p = partsOf(value, zone);
  if (p === null) return String(value);
  const meridiem = p.hour < 12 ? "am" : "pm";
  const hour = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${formatDate(value, zone)}, ${String(hour)}:${String(p.minute).padStart(2, "0")}${meridiem}`;
}

/** "Monday" -- a day alone. */
export function weekdayName(ymd: string): string {
  const p = partsOf(ymd);
  return p === null ? ymd : (WEEKDAY_LONG[p.weekday] ?? ymd);
}
