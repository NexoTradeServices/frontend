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
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast, useToast } from "@/components/ui/toast";
import { timeLabelFor } from "@/components/ui/calendar-day-view";
import { Banner } from "@/components/auth/banner";
import { addDays, dayMonth, weekdayDayMonth, type SlotState, type WeekDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const LOCKED: readonly SlotState[] = ["booked", "in_progress", "to_answer", "closed", "past"];
const arrow =
  "flex min-h-11 min-w-11 items-center justify-center rounded-button border border-hairline bg-surface text-base font-bold text-ink";

function minutesOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function AvailabilityGrid({
  base,
  initial,
  onlyDate,
  onSaved,
}: {
  /** "/api/contractor" or "/api/contractors/CON-014" */
  base: string;
  initial: WeekDto;
  /** the dispatch pop-up: just this day, Save only */
  onlyDate?: string;
  onSaved?: () => void;
}) {
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState(onlyDate ?? initial.days[0]?.date ?? "");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"day" | "week">("day"); // phone only: one day to edit, or the whole week as a colour snapshot
  const [problem, setProblem] = useState<string | undefined>();
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState<{ week: string; pick?: string } | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const router = useRouter();
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
    // A menu or tab link moves inside the app without a page unload, so the browser warning never fires: catch the click.
    const catchLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const to = new URL(link.href, window.location.href);
      if (to.origin !== window.location.origin) return;
      if (to.pathname === window.location.pathname && to.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveHref(to.pathname + to.search + to.hash);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", catchLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", catchLink, true);
    };
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
    if (state === "booked" || state === "in_progress" || state === "to_answer") showToast("This time has a job. Ring the office to change it.");
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

  async function go(week: string, pick?: string) {
    setProblem(undefined);
    // a new week opens on its Monday, or on the day picked in the date box
    const body = await load(week);
    if (body !== null) setSelected(pick ?? body.days[0]?.date ?? week);
  }

  function changeWeek(week: string, pick?: string) {
    if (unsaved > 0) setLeaveAsk({ week, pick });
    else void go(week, pick);
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
    else showToast(Number(result["written"] ?? 0) === 0 ? "The next day already matches." : "Copied to the next day.");
  }

  async function copyRest() {
    const result = await call("/copy-rest", "POST", { from: selected, changes: changesList() });
    if (result === null) return;
    setPending({});
    const weekOfSelected = await load(weekStart(selected));
    if (weekOfSelected === null) setProblem("Copied, but the week could not be reloaded.");
    else showToast(Number(result["written"] ?? 0) === 0 ? "The rest of the week already matches." : "Copied to the rest of the week.");
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
    setSelected(target); // a new week always opens on its Monday
    showToast(
      Number(result["written"] ?? 0) === 0
        ? `Nothing changed. The week of ${dayMonth(target)} already matches this week.`
        : `This week is copied to next week (week of ${dayMonth(target)}).`,
    );
  }

  function dayOff(date: string) {
    const day = data.days.find((d) => d.date === date);
    if (day === undefined) return;
    const open = day.slots.filter((s) => !LOCKED.includes(s.state));
    const allOff = open.every((s) => !availableNow(date, s.time, s.state));
    for (const slot of open) setSlot(date, slot.time, slot.state, allOff);
  }

  const dayHasOpen = (date: string): boolean =>
    (data.days.find((d) => d.date === date)?.slots.some((s) => !LOCKED.includes(s.state))) ?? false;

  const dayAllOff = (date: string): boolean => {
    const day = data.days.find((d) => d.date === date);
    const open = day?.slots.filter((s) => !LOCKED.includes(s.state)) ?? [];
    return open.length > 0 && open.every((s) => !availableNow(date, s.time, s.state));
  };

  function cellClass(state: SlotState, available: boolean): string {
    if (state === "closed") return "bg-error-bg text-brand-destructive";
    if (state === "past") return "bg-ground text-muted-text opacity-60";
    if (state === "booked") return "bg-status-scheduled-bg text-status-scheduled";
    if (state === "in_progress") return "bg-status-in-progress-bg text-status-in-progress";
    if (state === "to_answer") return "bg-status-assigned-bg text-status-assigned";
    return available ? "bg-available text-muted-text hover:bg-success-bg" : "bg-not-available text-secondary-text";
  }

  function cellText(state: SlotState, available: boolean, closed: string | null, first: boolean, job: string | null): string {
    if (state === "closed") return first && closed ? closed : "";
    if (state === "booked") return job ?? "Job";
    if (state === "in_progress") return job ? `${job} - In progress` : "In progress";
    if (state === "to_answer") return job ? `${job} - To answer` : "To answer";
    if (state === "past") return job ?? "";
    return available ? "Available" : "Not available";
  }

  return (
    <div className="rounded-card border border-hairline bg-surface p-3 sm:p-5">
      {onlyDate === undefined ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h3 className="font-heading text-base font-extrabold text-ink">Week of {dayMonth(data.week)}</h3>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Jump to a date"
                value={selected}
                onChange={(event) => {
                  const picked = event.target.value;
                  if (picked !== "") changeWeek(weekStart(picked), picked);
                }}
                className="min-h-11 rounded-button border border-hairline bg-surface px-2 text-small font-semibold text-ink"
              />
              <button type="button" aria-label="Previous week" className={arrow} onClick={() => changeWeek(addDays(data.week, -7))}>
                <span aria-hidden>&#8249;</span>
              </button>
              <button type="button" aria-label="Next week" className={arrow} onClick={() => changeWeek(addDays(data.week, 7))}>
                <span aria-hidden>&#8250;</span>
              </button>
            </div>
          </div>
          <div className="mb-3 flex overflow-hidden rounded-button border border-hairline bg-surface md:hidden" role="tablist" aria-label="View">
            {(["day", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                onClick={() => setView(mode)}
                className={`min-h-11 flex-1 px-4 text-small font-bold ${mode === "week" ? "border-l border-hairline" : ""} ${
                  view === mode ? "bg-ground text-ink" : "text-muted-text"
                }`}
              >
                {mode === "day" ? "Day" : "Week"}
              </button>
            ))}
          </div>
        </>
      ) : (
        <h3 className="mb-3 font-heading text-base font-extrabold text-ink">{weekdayDayMonth(onlyDate)}</h3>
      )}

      {problem ? <Banner kind="error">{problem}</Banner> : null}

      {onlyDate === undefined && view === "day" ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2 md:hidden" role="tablist" aria-label="Day">
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
      <div className={`mb-3 flex flex-col items-start gap-2 ${view === "week" ? "max-md:hidden" : ""}`}>
        <div className="flex flex-nowrap items-center gap-1.5 text-xs text-muted-text">
          <span className="shrink-0">Copy to:</span>
          <div className="flex min-w-0 overflow-hidden rounded-button border border-hairline bg-surface">
            <button
              type="button"
              aria-label="Copy to next day"
              className="min-h-11 px-2 text-xs font-bold text-ink disabled:opacity-60"
              disabled={busy}
              onClick={() => void copyDay()}
            >
              Next day
            </button>
            <button
              type="button"
              aria-label="Copy to the rest of the week"
              className="min-h-11 border-l border-hairline px-2 text-xs font-bold text-ink disabled:opacity-60"
              disabled={busy || addDays(weekStart(selected), 6) === selected}
              onClick={() => void copyRest()}
            >
              Rest of week
            </button>
            <button
              type="button"
              aria-label="Copy to next week"
              className="min-h-11 border-l border-hairline px-2 text-xs font-bold text-ink disabled:opacity-60"
              disabled={busy}
              onClick={() => void copyWeek(false)}
            >
              This week to next week
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {onlyDate === undefined ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-field-label text-muted-text" data-testid="availability-legend">
          {[
            ["bg-available border-hairline", "Available"],
            ["bg-not-available border-hairline", "Not available"],
            ["bg-status-scheduled-bg border-status-scheduled", "Job"],
            ["bg-status-in-progress-bg border-status-in-progress", "In progress"],
            ["bg-status-assigned-bg border-status-assigned", "To answer"],
            ["bg-error-bg border-error-border", "Holiday"],
          ].map(([swatch, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-5 rounded-sm border ${swatch}`} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <p className={`mb-3 text-xs text-muted-text ${view === "week" ? "max-md:hidden" : ""}`}>
        Tap a half hour to switch it between Available and Not available.
        {base === "/api/contractor" ? "" : ` Times are ${data.operatingState} time.`}
      </p>

      {onlyDate === undefined && view === "week" ? (
        <div className="mb-3 rounded-small-box border border-hairline md:hidden" data-testid="availability-week-snapshot">
          <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))]">
            <div />
            {data.days.map((day) => (
              <button
                key={day.date}
                type="button"
                aria-label={`Open ${weekdayDayMonth(day.date)}`}
                onClick={() => {
                  setSelected(day.date);
                  setView("day");
                }}
                className="min-h-11 border-l border-hairline px-0.5 text-center text-field-label font-bold text-ink"
              >
                {weekdayDayMonth(day.date).replace(/ .*/, "")}
                <br />
                {day.date.slice(8).replace(/^0/, "")}
              </button>
            ))}
            {times.map((time, row) => (
              <div key={time} className="contents">
                <div className="h-3.5 pl-1 text-field-label leading-[14px] tabular-nums text-muted-text" aria-hidden>
                  {minutesOf(time) % 60 === 0 ? timeLabelFor(minutesOf(time)).replace(/:00/, "") : ""}
                </div>
                {data.days.map((day) => {
                  const slot = day.slots[row];
                  if (slot === undefined) return <div key={day.date} />;
                  const available = availableNow(day.date, slot.time, slot.state);
                  return (
                    <div
                      key={day.date}
                      data-state={slot.state}
                      className={`h-3.5 border-l border-hairline ${cellClass(slot.state, available)} ${keyOf(day.date, slot.time) in pending ? "ring-1 ring-inset ring-brand-accent/50" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`overflow-x-auto rounded-small-box border border-hairline ${onlyDate === undefined ? "" : "max-h-[55vh] overflow-y-auto"} ${view === "week" && onlyDate === undefined ? "max-md:hidden" : ""}`}
        data-testid="availability-grid"
      >
        {onlyDate === undefined && dayHasOpen(selected) ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => dayOff(selected)}
            className="min-h-11 w-full border-b border-hairline bg-surface text-small font-bold text-ink disabled:opacity-60 md:hidden"
          >
            {dayAllOff(selected) ? "Day on" : "Day off"}
          </button>
        ) : null}
        <div
          className="grid grid-cols-[58px_minmax(0,1fr)] md:grid-cols-[58px_repeat(var(--n),minmax(0,1fr))]"
          style={{ "--n": days.length } as React.CSSProperties}
        >
          <div className="hidden md:block" />
          {days.map((day) => (
            <div
              key={day.date}
              className="hidden flex-col items-center gap-1 border-l border-hairline px-1 py-1.5 text-center text-xs font-bold text-ink md:flex"
            >
              {onlyDate === undefined ? (
                <button
                  type="button"
                  aria-pressed={day.date === selected}
                  onClick={() => setSelected(day.date)}
                  className={`min-h-8 rounded-button border px-2 ${day.date === selected ? "border-brand-accent" : "border-transparent"}`}
                >
                  {weekdayDayMonth(day.date)}
                </button>
              ) : (
                weekdayDayMonth(day.date)
              )}
              {onlyDate === undefined && dayHasOpen(day.date) ? (
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
                  // A job is ONE block: a solid outline round the whole job, a dotted line at each half hour inside it.
                  const isJob = slot.state === "booked" || slot.state === "in_progress" || slot.state === "to_answer";
                  const joined = (other: (typeof day.slots)[number] | undefined) =>
                    isJob && other !== undefined && other.state === slot.state && (other.job ?? null) === (slot.job ?? null);
                  const sameAsPrev = joined(day.slots[row - 1]);
                  const sameAsNext = joined(day.slots[row + 1]);
                  const jobColour =
                    slot.state === "booked" ? "border-status-scheduled" : slot.state === "in_progress" ? "border-status-in-progress" : "border-status-assigned";
                  const afterJob = !isJob && ["booked", "in_progress", "to_answer"].includes(day.slots[row - 1]?.state ?? "");
                  const edges = isJob
                    ? `border-l border-r ${sameAsNext ? "" : "border-b"} ${jobColour}`
                    : `border-l ${half ? "border-dashed" : ""} border-hairline ${afterJob ? "border-t-0" : ""}`;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      data-state={slot.state}
                      data-available={available ? "yes" : "no"}
                      aria-label={`${weekdayDayMonth(day.date)} ${timeLabelFor(minutesOf(slot.time))} ${
                        LOCKED.includes(slot.state) ? slot.state.replace("_", " ") : available ? "available" : "not available"
                      }`}
                      style={isJob ? { borderTopStyle: sameAsPrev ? "dotted" : "solid" } : undefined}
                      className={`h-11 overflow-hidden text-ellipsis whitespace-nowrap border-t px-1 text-left text-field-label font-semibold ${edges} ${changed ? "ring-2 ring-inset ring-brand-accent/50" : ""} ${cellClass(slot.state, available)} ${
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
                      {isJob && sameAsPrev ? "" : cellText(slot.state, available, day.closed, row === 0, slot.job ?? null)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-3 mt-4 flex gap-2 border-t border-hairline bg-surface px-3 py-3 sm:-mx-5 sm:px-5 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <button
          type="button"
          className="min-h-11 rounded-button bg-brand-accent px-5 py-2.5 text-sm font-bold text-on-accent disabled:opacity-60"
          disabled={busy}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>

      <ConfirmDialog
        open={replaceAsk}
        title="Replace next week?"
        confirmLabel="Replace"
        loading={busy}
        loadingLabel="Copying..."
        onConfirm={() => void copyWeek(true)}
        onCancel={() => setReplaceAsk(false)}
      >
        <p>
          Next week (week of {dayMonth(addDays(data.week, 7))}) already has availability set. Copying this week over it replaces it. Times with a job
          stay as they are.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={leaveAsk !== null}
        title="Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          const ask = leaveAsk;
          setLeaveAsk(null);
          setPending({});
          if (ask !== null) void go(ask.week, ask.pick);
        }}
        onCancel={() => setLeaveAsk(null)}
      >
        <p>You have changes that are not saved. Leaving drops them.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={leaveHref !== null}
        title="Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          const to = leaveHref;
          setLeaveHref(null);
          setPending({});
          if (to !== null) router.push(to);
        }}
        onCancel={() => setLeaveHref(null)}
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
