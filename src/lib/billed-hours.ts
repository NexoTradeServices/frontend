// Billed hours, shown live while he types -- Feature 5001.
//
// The SAME rule as backend/src/jobs/billed-hours.ts, which stores the figure
// at Complete: each entry's minutes floored (the earliest entry, the first
// visit, at 60 minutes; every later one at the settings' return-visit
// minimum), rounded up to the next 15 minutes, summed as hours. The server
// owns the stored number; this one only previews it.
export interface EntryTimes {
  /** yyyy-mm-dd, the job's own calendar date. */
  date: string;
  /** hh:mm, 24-hour. */
  start: string;
  end: string;
}

const FIRST_VISIT_MINIMUM_MINUTES = 60;
const BLOCK_MINUTES = 15;

function minutesOfDay(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function billedHoursOf(entries: readonly EntryTimes[], returnVisitMinimumMinutes: number): number {
  const valid = entries.flatMap((entry) => {
    const start = minutesOfDay(entry.start);
    const end = minutesOfDay(entry.end);
    if (start === null || end === null || end <= start || entry.date === "") return [];
    return [{ sortKey: `${entry.date}T${entry.start}`, minutes: end - start }];
  });
  valid.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  let total = 0;
  valid.forEach((entry, index) => {
    const floor = index === 0 ? FIRST_VISIT_MINIMUM_MINUTES : returnVisitMinimumMinutes;
    total += Math.ceil(Math.max(entry.minutes, floor) / BLOCK_MINUTES) * BLOCK_MINUTES;
  });
  return Math.round((total / 60) * 100) / 100;
}

/** 3 -> "3.0", 3.25 -> "3.25", 3.5 -> "3.5" -- the aside's "Billed 3.0h". */
export function formatHours(hours: number): string {
  return hours.toFixed(2).replace(/0$/, "");
}
