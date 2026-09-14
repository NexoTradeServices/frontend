// Calendar day view -- frontend-conventions.md, Components / Calendar day
// view. Feature 4002, dispatch to assignment, plan decision 14: a SHARED
// component (2004's own calendar screen reuses it).
//
// One person's day, for one date: half-hour rows, each a full 44px tap
// target. Every block carries its time, job reference and suburb ON the
// block, never on hover alone. A booking reads in its status pair (booked =
// scheduled colours, a hold = assigned colours, dashed); the slot being
// proposed is a dashed accent outline, turning destructive when it clashes.
// A tap on a half hour moves the proposed start there, keeping the hold's
// length. Previous/next day buttons step the date; no month view.
"use client";

import { useEffect, useRef } from "react";

export interface DayBlock {
  startMinutes: number;
  endMinutes: number;
  timeLabel: string;
  jobReference: string | null;
  suburb: string | null;
  kind: "booked" | "hold" | "other";
}

const DAY_START = 360; // 6:00am
const DAY_END = 1290; // 9:30pm
const ROW_HEIGHT = 44; // px -- one half-hour row, the tap-target floor

export function timeLabelFor(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12)}:${String(m).padStart(2, "0")}${period}`;
}

function topOf(minutes: number): number {
  return ((minutes - DAY_START) / 30) * ROW_HEIGHT;
}

export function CalendarDayView({
  dayLabel,
  blocks,
  proposedStart,
  proposedEnd,
  onPickHalfHour,
  onStepDay,
  loading = false,
}: {
  /** e.g. "Bob's Monday 14/09" -- the caller composes it, this component only draws the grid. */
  dayLabel: string;
  blocks: DayBlock[];
  proposedStart: number;
  proposedEnd: number;
  onPickHalfHour: (minutes: number) => void;
  onStepDay: (delta: -1 | 1) => void;
  loading?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, topOf(proposedStart) - ROW_HEIGHT * 2);
    // Opens at the slot in hand when the day changes -- not re-jumped on
    // every half-hour tap within the same day (the person is scrolled where
    // they are working).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayLabel]);

  const clashes = blocks.some((block) => block.startMinutes < proposedEnd && block.endMinutes > proposedStart);
  const rows: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += 30) rows.push(m);

  return (
    <div className="mt-2 rounded-[10px] border border-hairline bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-extrabold text-ink">{dayLabel}</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onStepDay(-1)}
            aria-label="Previous day"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-hairline bg-surface text-base font-bold text-ink"
          >
            <span aria-hidden>&#8249;</span>
          </button>
          <button
            type="button"
            onClick={() => onStepDay(1)}
            aria-label="Next day"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-hairline bg-surface text-base font-bold text-ink"
          >
            <span aria-hidden>&#8250;</span>
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-text">Select a half-hour slot to set the start time.</p>
      <div
        ref={scrollRef}
        aria-busy={loading}
        className="relative max-h-[440px] overflow-y-auto rounded-md border border-hairline"
      >
        <div className="relative grid grid-cols-[58px_1fr]">
          {rows.map((minutes) => {
            const half = minutes % 60 !== 0;
            return (
              <div key={minutes} className="contents">
                <div
                  className={`h-11 pt-0.5 pl-1 text-[11px] tabular-nums ${half ? "text-transparent" : "text-muted-text"}`}
                  aria-hidden
                >
                  {timeLabelFor(minutes)}
                </div>
                <button
                  type="button"
                  onClick={() => onPickHalfHour(minutes)}
                  aria-label={`Start at ${timeLabelFor(minutes)}`}
                  className={`h-11 border-t px-2 text-left hover:bg-secondary ${
                    half ? "border-dashed border-hairline" : "border-hairline"
                  }`}
                />
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-y-0 left-[58px] right-0">
            {blocks.map((block, index) => (
              <div
                key={`${String(block.startMinutes)}-${String(index)}`}
                style={{ top: `${String(topOf(block.startMinutes) + 2)}px`, height: `${String(topOf(block.endMinutes) - topOf(block.startMinutes) - 4)}px` }}
                className={`absolute inset-x-1.5 overflow-hidden rounded-md border px-2 py-1 text-xs ${
                  block.kind === "hold"
                    ? "border-dashed border-status-assigned bg-status-assigned-bg text-status-assigned"
                    : "border-status-scheduled bg-status-scheduled-bg text-status-scheduled"
                }`}
              >
                <b className="tabular-nums">{block.timeLabel}</b>{" "}
                {block.jobReference ? `${block.jobReference} ${block.suburb ?? ""}` : block.kind === "hold" ? "Hold" : "Booked"}
              </div>
            ))}
            <div
              style={{ top: `${String(topOf(proposedStart) + 2)}px`, height: `${String(Math.max(topOf(proposedEnd) - topOf(proposedStart) - 4, ROW_HEIGHT - 4))}px` }}
              className={`absolute inset-x-6 overflow-hidden rounded-md border-2 border-dashed px-2 py-1 text-xs font-semibold ${
                clashes ? "border-brand-destructive bg-error-bg text-brand-destructive" : "border-brand-accent bg-brand-accent/10 text-ink"
              }`}
            >
              <b className="tabular-nums">
                {timeLabelFor(proposedStart)}-{timeLabelFor(proposedEnd)}
              </b>{" "}
              This job{clashes ? " - clashes" : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
