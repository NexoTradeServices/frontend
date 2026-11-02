// Shapes for the Availability grid and the Calendar -- Feature 2004. Mirrors backend/src/availability/.
export type SlotState = "available" | "not_available" | "booked" | "to_answer" | "closed" | "past";

export interface WeekDto {
  /** the Monday, YYYY-MM-DD, in the contractor's zone */
  week: string;
  zone: string;
  operatingState: string;
  openingTime: string;
  closingTime: string;
  availabilitySet: boolean;
  days: { date: string; closed: string | null; slots: { time: string; state: SlotState }[] }[];
}

export type CalendarStatus = "booked" | "to_answer" | "in_progress" | "finished";

export interface CalendarBlockDto {
  startMinutes: number;
  endMinutes: number;
  timeLabel: string;
  jobReference: string | null;
  suburb: string | null;
  status: CalendarStatus;
}

export interface CalendarDayDto {
  date: string;
  closed: string | null;
  past: boolean;
  blocks: CalendarBlockDto[];
  notAvailable: { startMinutes: number; endMinutes: number }[];
  jobCount: number;
}

export interface CalendarDto {
  zone: string;
  today: string;
  operatingState: string;
  openingTime: string;
  closingTime: string;
  availabilitySet: boolean;
  days: CalendarDayDto[];
}

export function addDays(date: string, delta: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2 Nov" */
export function dayMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${String(d.getUTCDate())} ${MONTHS[d.getUTCMonth()] ?? ""}`;
}

/** "Mon 2 Nov" */
export function weekdayDayMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()] ?? ""} ${dayMonth(date)}`;
}

export function monthTitle(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${full[d.getUTCMonth()] ?? ""} ${String(d.getUTCFullYear())}`;
}

/** "07:00" -> minutes */
export function minutesOfClock(clock: string): number {
  const [h, m] = clock.split(":");
  return Number(h) * 60 + Number(m);
}
