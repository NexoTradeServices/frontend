// The Availability grid -- Feature 2004, Organisms / Calendar and charts (Availability grid).
//
// One person's half hours for a week: the week row "< Week of 2 Nov >", a day strip on a phone (one day at a time) or seven
// columns from a tablet up, rows from the opening to the closing time, 44px tall, labelled down the left. Available is surface,
// Not available is not-available with secondary-text; a half hour a job holds, a holiday and the past are locked. Tap toggles a
// half hour; Day off / Day on, Copy to next day, Copy to next week and Save are the actions; from 1024px up a click and drag
// paints a run of half hours, sideways too, skipping locked ones. Nothing is saved until Save (or a Copy, which saves the
// unsaved taps with it). The server has the last word: a half hour a job took meanwhile is skipped there.
//
// One component for both doors (the contractor's own page and the tab on the office's record) and for the one-day pop-up on
// the dispatch page (`onlyDate`: no week arrows, no copy buttons, Save only).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast, useToast } from "@/components/ui/toast";
import { timeLabelFor } from "@/components/ui/calendar-day-view";
import { Banner } from "@/components/auth/banner";
import { addDays, dayMonth, weekdayDayMonth, type SlotState, type WeekDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const LOCKED: readonly SlotState[] = ["booked", "to_answer", "closed", "past"];
const arrow =
  "flex min-h-11 min-w-11 items-center justify-center rounded-button border border-hairline bg-surface text-base font-bold text-ink";
const outlined =
  "min-h-11 rounded-button border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-60";

function minutesOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function AvailabilityGrid({
  base,
  initial,
  onlyDate,
  onSaved,
  calendarHref,
}: {
  /** "/api/contractor" or "/api/contractors/CON-014" */
  base: string;
  initial: WeekDto;
  /** the dispatch pop-up: just this day, Save only */
  onlyDate?: string;
  onSaved?: () => void;
  calendarHref?: string;
}) {
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState(onlyDate ?? initial.days[0]?.date ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState<string | null>(null);
  const [toastMessage, showToast] = useToast();
  const dragValue = useRef<boolean | null>(null);
  const desktop = useRef(false);
  const unsaved = Object.keys(pending).length;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    desktop.current = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      desktop.current = event.matches;
    };
    query.addEventListener("change", onChange);
    const stop = () => {
      dragValue.current = null;
    };
    window.addEventListener("mouseup", stop);
    return () => {
      query.removeEventListener("change", onChange);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  useEffect(() => {
    if (unsaved === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const days = onlyDate === undefined ? data.days : data.days.filter((d) => d.date === onlyDate);
  const times = days[0]?.slots.map((s) => s.time) ?? [];
  const keyOf = (date: string, time: string) => `${date}|${time}`;

  const availableNow = useCallback(
    (date: string, time: string, state: SlotState): boolean => {
      const key = `${date}|${time}`;
      return key in pending ? (pending[key] ?? false) : state === "available";
    },
    [pending],
  );

  function setSlot(date: string, time: string, state: SlotState, value: boolean) {
    if (LOCKED.includes(state)) return;
    setPending((current) => {
      const next = { ...current };
      const key = keyOf(date, time);
      if (value === (state === "available")) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function lockedMessage(state: SlotState) {
    if (state === "booked" || state === "to_answer") showToast("This time has a job. Ring the office to change it.");
  }

  function press(date: string, time: string, state: SlotState) {
    if (LOCKED.includes(state)) {
      lockedMessage(state);
      return;
    }
    setSlot(date, time, state, !availableNow(date, time, state));
  }

  async function load(week: string): Promise<WeekDto | null> {
    try {
      const res = await fetch(`${apiUrl}${base}/availability?week=${week}`, { credentials: "include" });
      if (!res.ok) return null;
      const body = (await res.json()) as WeekDto;
      setData(body);
      return body;
    } catch {
      return null;
    }
  }

  async function go(week: string) {
    setProblem(undefined);
    await load(week);
  }

  function changeWeek(week: string) {
    if (unsaved > 0) setLeaveAsk(week);
    else void go(week);
  }

  const changesList = () => Object.entries(pending).map(([key, available]) => {
    const [date, time] = key.split("|");
    return { date, time, available };
  });

  async function call(path: string, method: "PUT" | "POST", body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setProblem(undefined);
    try {
      const res = await fetch(`${apiUrl}${base}/availability${path}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setProblem(typeof json["error"] === "string" ? json["error"] : "Couldn't save - try again shortly.");
        return null;
      }
      return json;
    } catch {
      setProblem("Couldn't save - check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const result = await call("", "PUT", { changes: changesList() });
    if (result === null) return;
    setPending({});
    await load(data.week);
    const skipped = Number(result["skipped"] ?? 0);
    showToast(skipped > 0 ? "Availability saved. Some times had a job, so they stayed as they were." : "Availability saved.");
    onSaved?.();
  }

  async function copyDay() {
    const result = await call("/copy-day", "POST", { from: selected, changes: changesList() });
    if (result === null) return;
    setPending({});
    const target = String(result["target"] ?? addDays(selected, 1));
    const weekOfTarget = await load(weekStart(target));
    setSelected(target);
    if (weekOfTarget === null) setProblem("Copied, but the week could not be reloaded.");
    else showToast("Copied to the next day.");
  }

  async function copyWeek(replace: boolean) {
    const result = await call("/copy-week", "POST", { fromWeek: data.week, replace, changes: changesList() });
    if (result === null) return;
    if (result["needsReplace"] === true) {
      setReplaceAsk(true);
      return;
    }
    setPending({});
    setReplaceAsk(false);
    const target = String(result["targetWeek"] ?? addDays(data.week, 7));
    await load(target);
    setSelected(target);
    showToast("Copied to next week.");
  }

  function dayOff(date: string) {
    const day = data.days.find((d) => d.date === date);
    if (day === undefined) return;
    const open = day.slots.filter((s) => !LOCKED.includes(s.state));
    const allOff = open.every((s) => !availableNow(date, s.time, s.state));
    for (const slot of open) setSlot(date, slot.time, slot.state, allOff);
  }

  const dayAllOff = (date: string): boolean => {
    const day = data.days.find((d) => d.date === date);
    const open = day?.slots.filter((s) => !LOCKED.includes(s.state)) ?? [];
    return open.length > 0 && open.every((s) => !availableNow(date, s.time, s.state));
  };

  function cellClass(state: SlotState, available: boolean): string {
    if (state === "closed") return "bg-not-available text-secondary-text";
    if (state === "past") return "bg-ground text-muted-text opacity-60";
    if (state === "booked") return "border-status-scheduled bg-status-scheduled-bg text-status-scheduled";
    if (state === "to_answer") return "border-dashed border-status-assigned bg-status-assigned-bg text-status-assigned";
    return available ? "bg-surface text-ink hover:bg-secondary" : "bg-not-available text-secondary-text";
  }

  function cellText(state: SlotState, available: boolean, closed: string | null, first: boolean): string {
    if (state === "closed") return first && closed ? `Closed - ${closed}` : "";
    if (state === "booked") return "Job";
    if (state === "to_answer") return "To answer";
    if (state === "past") return "";
    return available ? "" : "Not available";
  }

  const selectedDay = data.days.find((d) => d.date === selected);

  return (
    <div className="rounded-card border border-hairline bg-surface p-3 sm:p-5">
      {onlyDate === undefined ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-base font-extrabold text-ink">Week of {dayMonth(data.week)}</h3>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Previous week" className={arrow} onClick={() => changeWeek(addDays(data.week, -7))}>
              <span aria-hidden>&#8249;</span>
            </button>
            <button type="button" aria-label="Next week" className={arrow} onClick={() => changeWeek(addDays(data.week, 7))}>
              <span aria-hidden>&#8250;</span>
            </button>
          </div>
        </div>
      ) : (
        <h3 className="mb-3 font-heading text-base font-extrabold text-ink">{weekdayDayMonth(onlyDate)}</h3>
      )}
      <p className="mb-3 text-xs text-muted-text">
        Tap a half hour to switch it between Available and Not available. Times are {data.operatingState} time.
      </p>

      {problem ? <Banner kind="error">{problem}</Banner> : null}

      {onlyDate === undefined ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto md:hidden" role="tablist" aria-label="Day">
          {data.days.map((day) => (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={day.date === selected}
              onClick={() => setSelected(day.date)}
              className={`min-h-11 min-w-14 shrink-0 rounded-button border px-2 text-small font-bold ${
                day.date === selected ? "border-brand-accent text-ink" : "border-hairline text-muted-text"
              }`}
            >
              {weekdayDayMonth(day.date).replace(/ .*/, "")}
              <br />
              {dayMonth(day.date)}
            </button>
          ))}
        </div>
      ) : null}
      {onlyDate === undefined ? (
        <div className="mb-3 flex justify-end md:hidden">
          <button type="button" className={outlined} disabled={busy || selectedDay === undefined} onClick={() => dayOff(selected)}>
            {dayAllOff(selected) ? "Day on" : "Day off"}
          </button>
        </div>
      ) : null}

      <div
        className={`overflow-x-auto rounded-small-box border border-hairline ${onlyDate === undefined ? "" : "max-h-[55vh] overflow-y-auto"}`}
        data-testid="availability-grid"
      >
        <div
          className="grid grid-cols-[58px_minmax(0,1fr)] md:grid-cols-[58px_repeat(var(--n),minmax(0,1fr))]"
          style={{ "--n": days.length } as React.CSSProperties}
        >
          <div />
          {days.map((day) => (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-1 border-l border-hairline px-1 py-1.5 text-center text-xs font-bold text-ink ${
                onlyDate === undefined && day.date !== selected ? "hidden md:flex" : ""
              }`}
            >
              {onlyDate === undefined ? (
                <button
                  type="button"
                  aria-pressed={day.date === selected}
                  onClick={() => setSelected(day.date)}
                  className={`rounded px-1 ${day.date === selected ? "underline decoration-brand-accent decoration-2 underline-offset-4" : ""}`}
                >
                  {weekdayDayMonth(day.date)}
                </button>
              ) : (
                weekdayDayMonth(day.date)
              )}
              {onlyDate === undefined ? (
                <button
                  type="button"
                  className="hidden min-h-8 rounded-button border border-hairline px-2 text-field-label font-bold md:block"
                  disabled={busy}
                  onClick={() => dayOff(day.date)}
                >
                  {dayAllOff(day.date) ? "Day on" : "Day off"}
                </button>
              ) : null}
            </div>
          ))}
          {times.map((time, row) => {
            const half = minutesOf(time) % 60 !== 0;
            return (
              <div key={time} className="contents">
                <div className={`h-11 pt-0.5 pl-1 text-field-label tabular-nums ${half ? "text-transparent" : "text-muted-text"}`} aria-hidden>
                  {timeLabelFor(minutesOf(time))}
                </div>
                {days.map((day) => {
                  const slot = day.slots[row];
                  if (slot === undefined) return <div key={day.date} />;
                  const available = availableNow(day.date, slot.time, slot.state);
                  const changed = keyOf(day.date, slot.time) in pending;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      data-state={slot.state}
                      data-available={available ? "yes" : "no"}
                      aria-label={`${weekdayDayMonth(day.date)} ${timeLabelFor(minutesOf(slot.time))} ${
                        LOCKED.includes(slot.state) ? slot.state.replace("_", " ") : available ? "available" : "not available"
                      }`}
                      className={`h-11 border-t border-l px-1 text-left text-field-label font-semibold ${
                        half ? "border-dashed" : ""
                      } border-hairline ${changed ? "ring-2 ring-inset ring-brand-accent" : ""} ${cellClass(slot.state, available)} ${
                        onlyDate === undefined && day.date !== selected ? "hidden md:block" : ""
                      }`}
                      onClick={() => {
                        if (!desktop.current) press(day.date, slot.time, slot.state);
                      }}
                      onMouseDown={(event) => {
                        if (!desktop.current || event.button !== 0) return;
                        if (LOCKED.includes(slot.state)) {
                          lockedMessage(slot.state);
                          return;
                        }
                        event.preventDefault();
                        const value = !availableNow(day.date, slot.time, slot.state);
                        dragValue.current = value;
                        setSlot(day.date, slot.time, slot.state, value);
                      }}
                      onMouseEnter={() => {
                        if (dragValue.current !== null) setSlot(day.date, slot.time, slot.state, dragValue.current);
                      }}
                    >
                      {cellText(slot.state, available, day.closed, row === 0)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onlyDate === undefined ? (
          <>
            <button type="button" className={outlined} disabled={busy} onClick={() => void copyDay()}>
              Copy to next day
            </button>
            <button type="button" className={outlined} disabled={busy} onClick={() => void copyWeek(false)}>
              Copy to next week
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="min-h-11 rounded-button bg-brand-accent px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          disabled={busy}
          onClick={() => void save()}
        >
          Save
        </button>
        {calendarHref ? (
          <a href={calendarHref} className="ml-auto self-center text-small font-semibold text-secondary-text underline underline-offset-2">
            Back to calendar
          </a>
        ) : null}
      </div>

      <ConfirmDialog
        open={replaceAsk}
        title="Replace it?"
        confirmLabel="Replace"
        loading={busy}
        loadingLabel="Copying..."
        onConfirm={() => void copyWeek(true)}
        onCancel={() => setReplaceAsk(false)}
      >
        <p>Next week already has availability set. Copying this week over it replaces what is there.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={leaveAsk !== null}
        title="Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          const week = leaveAsk;
          setLeaveAsk(null);
          setPending({});
          if (week !== null) void go(week);
        }}
        onCancel={() => setLeaveAsk(null)}
      >
        <p>You have changes that are not saved. Leaving drops them.</p>
      </ConfirmDialog>
      <Toast message={toastMessage} />
    </div>
  );
}

function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
