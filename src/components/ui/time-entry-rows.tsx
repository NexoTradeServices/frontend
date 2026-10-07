// Time entry rows -- frontend-conventions.md, Molecules / Form pieces (Time
// entry row). Feature 5001.
//
// One attendance per row: a Date box, Start and Finish Time boxes, and a Note
// in a Multi-line box that can be dragged taller from its corner, a Delete
// Text button at the row's end, rows divided by a Divider, a Text button
// "+ Add a visit" under the last. On Mobile the Date sits on its own line and
// Start and Finish share the next. Finish shows the current time as its
// computed default - muted italic until the person picks their own. The Time
// box is our own hour / minute / am-pm control (components/ui/time-box.tsx).
//
// Used by Bob's job screen and by the ops job page's "Time on site" card, so
// the row looks and behaves the same in both. Three modes: `edit`, `frozen`
// (a completed job on Bob's screen: ground fill, lock icon, "Locked when the
// job was completed") and `facts` (ops, read-only: plain Facts, no box).
"use client";

import { Lock } from "lucide-react";
import { TimeBox } from "@/components/ui/time-box";
import { formatClock, formatVisitDate, nowInZone } from "@/lib/visit-format";

export interface TimeEntryRow {
  key: string;
  date: string;
  start: string;
  end: string;
  note: string;
  /** Finish still holds its computed default (now) -- shown muted italic. */
  endIsDefault: boolean;
}

export const FROZEN_MESSAGE = "Locked when the job was completed";

let nextKey = 0;
export function freshKey(prefix: string): string {
  nextKey += 1;
  return `${prefix}-${String(nextKey)}`;
}

/** A row ready to fill: today's date and the clock now, in the JOB's zone. */
export function newEntryRow(zone: string): TimeEntryRow {
  const now = nowInZone(zone);
  return { key: freshKey("entry"), date: now.date, start: "", end: now.time, note: "", endIsDefault: true };
}

export function rowsFromEntries(entries: { date: string; start: string; end: string; note: string }[], zone: string): TimeEntryRow[] {
  if (entries.length === 0) return [newEntryRow(zone)];
  return entries.map((entry) => ({ key: freshKey("entry"), ...entry, endIsDefault: false }));
}

/** A row nobody has touched: no start, no note, Finish still its default. */
export function isBlankRow(row: TimeEntryRow): boolean {
  return row.start === "" && row.note.trim() === "" && (row.endIsDefault || row.end === "");
}

const labelClass = "mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
const starClass = "after:ml-0.5 after:text-brand-destructive after:content-['*']";
const boxClass =
  "min-h-[44px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";

function Control({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`${labelClass} ${required ? starClass : ""}`}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-[5px] text-xs text-brand-destructive">{error}</p> : null}
    </div>
  );
}

function LockedBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>
      <div className="flex min-h-[44px] items-center gap-2 rounded-md border border-hairline bg-ground px-2.5 py-2 text-sm text-ink">
        <Lock aria-hidden className="size-3.5 shrink-0 text-muted-text" />
        <span className="whitespace-pre-wrap">{value}</span>
      </div>
    </div>
  );
}

function FactBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>
      <div className="font-semibold text-ink whitespace-pre-wrap">{value}</div>
    </div>
  );
}

const rowGrid = "grid grid-cols-2 gap-x-3.5 gap-y-3.5 md:grid-cols-[1.2fr_1fr_1fr_2fr]";

export function TimeEntryRows({
  rows,
  mode = "edit",
  zone,
  idPrefix,
  errors = {},
  onChange,
}: {
  rows: TimeEntryRow[];
  mode?: "edit" | "frozen" | "facts";
  zone: string;
  idPrefix: string;
  /** Keyed `<row index>.date`, `.start`, `.end`, `.note`; `rows` for a whole-list error. */
  errors?: Record<string, string>;
  onChange?: (next: TimeEntryRow[]) => void;
}) {
  if (mode !== "edit") {
    return (
      <div>
        {rows.length === 0 ? <p className="text-[13px] text-muted-text">No time entered.</p> : null}
        {rows.map((row, index) => (
          <div key={row.key} className={index > 0 ? "mt-3.5 border-t border-hairline pt-3.5" : undefined}>
            <div className={rowGrid}>
              {mode === "frozen" ? (
                <>
                  <LockedBox label="Date" value={formatVisitDate(row.date)} />
                  <LockedBox label="Start" value={formatClock(row.start)} />
                  <LockedBox label="Finish" value={formatClock(row.end)} />
                  <div className="col-span-2 md:col-span-1">
                    <LockedBox label="Note" value={row.note === "" ? "-" : row.note} />
                  </div>
                </>
              ) : (
                <>
                  <FactBox label="Date" value={formatVisitDate(row.date)} />
                  <FactBox label="Start" value={formatClock(row.start)} />
                  <FactBox label="Finish" value={formatClock(row.end)} />
                  <div className="col-span-2 md:col-span-1">
                    <FactBox label="Note" value={row.note === "" ? "-" : row.note} />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {mode === "frozen" ? <p className="mt-[5px] text-xs text-muted-text">{FROZEN_MESSAGE}</p> : null}
      </div>
    );
  }

  function update(index: number, changes: Partial<TimeEntryRow>) {
    onChange?.(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  return (
    <div>
      {rows.map((row, index) => {
        const id = `${idPrefix}-${String(index)}`;
        const at = (field: string): string | undefined => errors[`${String(index)}.${field}`];
        return (
          <div key={row.key} className={index > 0 ? "mt-3.5 border-t border-hairline pt-3.5" : undefined} data-testid="time-entry-row">
            <div className={rowGrid}>
              <div className="col-span-2 md:col-span-1">
                <Control id={`${id}-date`} label="Date" required error={at("date")}>
                  <input
                    id={`${id}-date`}
                    type="date"
                    value={row.date}
                    aria-invalid={at("date") ? true : undefined}
                    onChange={(e) => update(index, { date: e.target.value })}
                    className={`${boxClass} ${at("date") ? "border-brand-destructive" : "border-hairline"}`}
                  />
                </Control>
              </div>
              <Control id={`${id}-start-hour`} label="Start" required error={at("start")}>
                <TimeBox
                  id={`${id}-start`}
                  label="Start"
                  value={row.start}
                  invalid={Boolean(at("start"))}
                  onChange={(value) => update(index, { start: value })}
                />
              </Control>
              <Control id={`${id}-end-hour`} label="Finish" required error={at("end")}>
                <TimeBox
                  id={`${id}-end`}
                  label="Finish"
                  value={row.end}
                  invalid={Boolean(at("end"))}
                  muted={row.endIsDefault}
                  onChange={(value) => update(index, { end: value, endIsDefault: false })}
                />
              </Control>
              <div className="col-span-2 md:col-span-1">
                <Control id={`${id}-note`} label="Note" error={at("note")}>
                  <textarea
                    id={`${id}-note`}
                    rows={3}
                    value={row.note}
                    onChange={(e) => update(index, { note: e.target.value })}
                    className={`${boxClass} resize-y ${at("note") ? "border-brand-destructive" : "border-hairline"}`}
                  />
                </Control>
              </div>
            </div>
            <button
              type="button"
              aria-label={`Delete visit ${String(index + 1)}`}
              onClick={() => onChange?.(rows.length === 1 ? [newEntryRow(zone)] : rows.filter((_, i) => i !== index))}
              className="mt-1 min-h-11 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
            >
              Delete
            </button>
          </div>
        );
      })}
      {errors["rows"] ? <p className="mt-[5px] text-xs text-brand-destructive">{errors["rows"]}</p> : null}
      <button
        type="button"
        onClick={() => onChange?.([...rows, newEntryRow(zone)])}
        className="mt-1 min-h-11 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
      >
        + Add a visit
      </button>
    </div>
  );
}
