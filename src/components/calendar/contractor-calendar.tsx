// The contractor's Calendar -- Feature 2004, Organisms / Calendar and charts (Calendar day, Calendar week, Month view).
//
// Look only. A phone draws one day with Previous and Next; a tablet and up draws the week (seven Calendar day columns side by
// side); both have the Month view. Rows run from the opening to the closing time, 44px per half hour. A booking shows its time,
// job reference and suburb ON the block, in its status look: Booked (Scheduled colours), To answer (Assigned, dashed), In
// progress, Finished (success border, no fill). Not available half hours are not-available; a public holiday is the whole day
// in not-available with "Closed - <name>" across it. A "Change availability" link goes to Availability on that week.
// Job times are on the job's own clock, plain.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { timeLabelFor } from "@/components/ui/calendar-day-view";
import { addDays, dayMonth, mondayOf, minutesOfClock, monthTitle, weekdayDayMonth, type CalendarBlockDto, type CalendarDayDto, type CalendarDto } from "@/components/availability/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const ROW = 44; // px per half hour
const arrow =
  "flex min-h-11 min-w-11 items-center justify-center rounded-button border border-hairline bg-surface text-base font-bold text-ink";

const BLOCK_CLASS: Record<CalendarBlockDto["status"], string> = {
  booked: "border-status-scheduled bg-status-scheduled-bg text-status-scheduled",
  to_answer: "border-dashed border-status-assigned bg-status-assigned-bg text-status-assigned",
  in_progress: "border-status-in-progress bg-status-in-progress-bg text-status-in-progress",
  finished: "border-brand-success bg-surface text-brand-success",
};

function DayColumn({ day, open, close }: { day: CalendarDayDto; open: number; close: number }) {
  const top = (minutes: number) => ((minutes - open) / 30) * ROW;
  const rows: number[] = [];
  for (let m = open; m < close; m += 30) rows.push(m);
  return (
    <div className="relative min-w-0" data-testid={`day-${day.date}`}>
      {rows.map((m) => (
        <div key={m} className={`h-11 border-t ${m % 60 === 0 ? "border-hairline" : "border-dashed border-hairline"}`} />
      ))}
      <div className="pointer-events-none absolute inset-0">
        {day.notAvailable.map((run) => (
          <div
            key={run.startMinutes}
            className="absolute inset-x-0 bg-not-available"
            style={{ top: `${String(top(run.startMinutes))}px`, height: `${String(top(run.endMinutes) - top(run.startMinutes))}px` }}
            data-testid="not-available-run"
          />
        ))}
        {day.closed !== null ? (
          <div className="absolute inset-0 flex items-start bg-not-available p-1.5 text-small font-semibold text-secondary-text" data-testid="closed-day">
            Closed - {day.closed}
          </div>
        ) : null}
        {day.blocks.map((block, i) => (
          <div
            key={`${String(block.startMinutes)}-${String(i)}`}
            data-status={block.status}
            className={`absolute inset-x-1 overflow-hidden rounded-small-box border px-1.5 py-1 text-xs ${BLOCK_CLASS[block.status]}`}
            style={{ top: `${String(top(block.startMinutes) + 2)}px`, height: `${String(Math.max(top(block.endMinutes) - top(block.startMinutes) - 4, 22))}px` }}
          >
            <b className="tabular-nums">{block.timeLabel}</b> {block.jobReference ?? ""} {block.suburb ?? ""}
            {block.status === "finished" ? " - Done" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContractorCalendar({
  base,
  initial,
  availabilityHref,
}: {
  /** "/api/contractor" or "/api/contractors/CON-014" */
  base: string;
  initial: CalendarDto;
  /** the Availability page for the same contractor; `?week=` is added */
  availabilityHref: string;
}) {
  const [mode, setMode] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState(initial.today);
  const [data, setData] = useState(initial);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      setWide(query.matches);
      setMode((current) => (current === "month" ? "month" : query.matches ? "week" : "day"));
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const range = useCallback(
    (view: "day" | "week" | "month", at: string): { from: string; to: string } => {
      if (view === "day") return { from: at, to: at };
      if (view === "week") return { from: mondayOf(at), to: addDays(mondayOf(at), 6) };
      const first = `${at.slice(0, 7)}-01`;
      const gridStart = mondayOf(first);
      const lastOfMonth = new Date(Date.UTC(Number(at.slice(0, 4)), Number(at.slice(5, 7)), 0)).toISOString().slice(0, 10);
      return { from: gridStart, to: addDays(mondayOf(lastOfMonth), 6) };
    },
    [],
  );

  useEffect(() => {
    let live = true;
    const { from, to } = range(mode, anchor);
    void fetch(`${apiUrl}${base}/calendar?from=${from}&to=${to}`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<CalendarDto>) : null))
      .then((body) => {
        if (live && body !== null) setData(body);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mode, anchor, base, range]);

  function step(delta: number) {
    if (mode === "day") setAnchor(addDays(anchor, delta));
    else if (mode === "week") setAnchor(addDays(anchor, 7 * delta));
    else {
      const d = new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + delta);
      setAnchor(d.toISOString().slice(0, 10));
    }
  }

  const open = minutesOfClock(data.openingTime);
  const close = minutesOfClock(data.closingTime);
  const title = mode === "month" ? monthTitle(anchor) : mode === "day" ? weekdayDayMonth(anchor) : `Week of ${dayMonth(mondayOf(anchor))}`;
  const rowsCount = Math.max(0, (close - open) / 30);
  const visible = data.days.filter((d) => (mode === "month" ? true : mode === "day" ? d.date === anchor : true));

  return (
    <div className="rounded-card border border-hairline bg-surface p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-extrabold text-ink">{title}</h3>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex gap-1.5" role="tablist" aria-label="View">
            {(wide ? (["week", "month"] as const) : (["day", "month"] as const)).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={mode === view}
                onClick={() => setMode(view)}
                className={`min-h-11 rounded-button border px-3 text-small font-bold ${mode === view ? "border-brand-accent text-ink" : "border-hairline text-muted-text"}`}
              >
                {view === "day" ? "Day" : view === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <button type="button" aria-label="Previous" className={arrow} onClick={() => step(-1)}>
            <span aria-hidden>&#8249;</span>
          </button>
          <button type="button" aria-label="Next" className={arrow} onClick={() => step(1)}>
            <span aria-hidden>&#8250;</span>
          </button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-text">Times are on each job&apos;s own clock. Look only - change your times on Availability.</p>
        <Link
          href={`${availabilityHref}?week=${mondayOf(anchor)}`}
          className="text-small font-semibold text-secondary-text underline underline-offset-2"
        >
          Change availability
        </Link>
      </div>

      {mode === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-small-box border border-hairline bg-hairline" data-testid="month-view">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="bg-surface px-1 py-1 text-center text-field-label font-bold text-muted-text uppercase">
              {d}
            </div>
          ))}
          {visible.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                setAnchor(day.date);
                setMode(wide ? "week" : "day");
              }}
              className={`min-h-[52px] bg-surface p-1 text-left align-top ${day.closed !== null ? "bg-not-available" : ""} ${
                day.date === data.today ? "outline outline-2 -outline-offset-2 outline-brand-accent" : ""
              } ${day.date.slice(0, 7) !== anchor.slice(0, 7) ? "opacity-50" : ""}`}
              aria-label={`${weekdayDayMonth(day.date)}${day.closed ? `, closed - ${day.closed}` : ""}, ${String(day.jobCount)} ${day.jobCount === 1 ? "job" : "jobs"}`}
            >
              <span className="block text-xs text-ink tabular-nums">{day.date.slice(8).replace(/^0/, "")}</span>
              {day.jobCount > 0 ? (
                wide ? (
                  day.blocks.slice(0, 3).map((b, i) => (
                    <span key={i} className={`mt-0.5 block truncate rounded border px-1 text-field-label ${BLOCK_CLASS[b.status]}`}>
                      {b.jobReference ?? "Job"}
                    </span>
                  ))
                ) : (
                  <span className="mt-0.5 inline-block rounded bg-status-scheduled-bg px-1.5 text-field-label font-bold text-status-scheduled">{day.jobCount}</span>
                )
              ) : null}
              {day.closed !== null ? <span className="block text-field-label text-secondary-text">Closed</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-small-box border border-hairline" data-testid={mode === "week" ? "week-view" : "day-view"}>
          <div
            className="grid"
            style={{ gridTemplateColumns: `58px repeat(${String(visible.length)}, minmax(0, 1fr))`, minWidth: mode === "week" ? "640px" : undefined }}
          >
            <div />
            {visible.map((day) => (
              <div key={day.date} className="border-l border-hairline px-1 py-1.5 text-center text-xs font-bold text-ink">
                {weekdayDayMonth(day.date)}
              </div>
            ))}
            <div>
              {Array.from({ length: rowsCount }, (_, i) => open + i * 30).map((m) => (
                <div key={m} className={`h-11 pt-0.5 pl-1 text-field-label tabular-nums ${m % 60 === 0 ? "text-muted-text" : "text-transparent"}`} aria-hidden>
                  {timeLabelFor(m)}
                </div>
              ))}
            </div>
            {visible.map((day) => (
              <div key={day.date} className="border-l border-hairline">
                <DayColumn day={day} open={open} close={close} />
              </div>
            ))}
          </div>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-field-label text-muted-text">
        <li>Booked</li>
        <li>To answer (dashed)</li>
        <li>In progress</li>
        <li>Finished (green outline)</li>
        <li>Not available (grey)</li>
      </ul>
    </div>
  );
}
