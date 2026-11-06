// The Return visit form -- Feature 5002, Organisms / Calendar and charts (Return visit card) with the Calendar day. It sits in a Form dialog.
//
// Bob's "Book a return visit": a required Reason (Part on order, More time needed, Other with its words), then either
// Pick a time (a date, how long, and a tap on his own day) or Not yet (with an optional note for the office). The card
// only collects the answers; the dialog's Confirm return visit / Put on hold sends them with the screen's times,
// notes and parts. Time he has switched off is still tappable -- booking it switches it on, and the card says so.
"use client";

import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/auth/banner";
import { Field } from "@/components/auth/field";
import { SelectField } from "@/components/ui/select-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { CalendarDayView, timeLabelFor, type DayBlock } from "@/components/ui/calendar-day-view";
import { formatDateWithDay } from "@/lib/date-format";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ReturnReasonValue = "" | "part_on_order" | "more_time_needed" | "other";

export interface ReturnDraft {
  reason: ReturnReasonValue;
  otherText: string;
  choice: "" | "pick" | "notyet";
  officeNote: string;
  date: string;
  startMinutes: number;
  /** true once he has tapped a half hour: the default start is only where the picture begins. */
  startPicked: boolean;
  holdMinutes: number;
}

interface DayData {
  blocks: DayBlock[];
  notAvailable: { startMinutes: number; endMinutes: number }[];
  closed: string | null;
  openingTime: string;
  closingTime: string;
}

const minutesOfClock = (clock: string): number => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
const holdOptions = Array.from({ length: 15 }, (_, i) => {
  const minutes = 60 + i * 30;
  const hours = Math.floor(minutes / 60);
  const label = `${String(hours)}${minutes % 60 === 0 ? "" : ".5"} hour${minutes === 60 ? "" : "s"}`;
  return { value: String(minutes), label };
});

/** Now as minutes after midnight in the zone, with its date. */
function nowIn(zone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** A date as YYYY-MM-DD in the job's zone, `plus` days from today. */
export function dayInZone(zone: string, plus: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) + plus * 86_400_000).toISOString().slice(0, 10);
}

export function emptyDraft(zone: string): ReturnDraft {
  return { reason: "", otherText: "", choice: "", officeNote: "", date: dayInZone(zone, 1), startMinutes: 480, startPicked: false, holdMinutes: 60 };
}

/** Are the required answers in? (The bottom bar's Primary is greyed until they are.) */
export function draftReady(draft: ReturnDraft, day: { closed: string | null } | null): boolean {
  if (draft.reason === "" || (draft.reason === "other" && draft.otherText.trim() === "") || draft.choice === "") return false;
  if (draft.choice === "notyet") return true;
  return draft.startPicked && draft.date !== "" && (day === null || day.closed === null);
}

export function ReturnVisitCard({
  reference,
  zone,
  draft,
  onChange,
  error,
  onDay,
}: {
  reference: string;
  zone: string;
  draft: ReturnDraft;
  onChange: (next: ReturnDraft) => void;
  /** The server's refusal, shown above the day. */
  error?: string;
  /** Tells the screen what the day says (a holiday), so it can grey the Primary. */
  onDay?: (day: { closed: string | null } | null) => void;
}) {
  const [day, setDay] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (changes: Partial<ReturnDraft>) => onChange({ ...draft, ...changes });
  // The proposed start is the first half hour at or after the time asked for that is free -- never over a job, a hold or
  // time he switched off -- and never in the past today (the same smart pick as dispatch). A tap of his own is left alone.
  const wantedStart = useRef(draft.startMinutes);
  const tapped = useRef(false);

  useEffect(() => {
    if (draft.choice !== "pick" || draft.date === "") return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the day is read from the server when the date changes
    setLoading(true);
    setDay(null);
    onDay?.(null);
    void fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(reference)}/day?date=${draft.date}`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<DayData>) : null))
      .then((body) => {
        if (!live) return;
        setDay(body);
        onDay?.(body);
        setLoading(false);
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, draft.choice, draft.date]);

  useEffect(() => {
    if (draft.choice !== "pick" || day === null || day.closed !== null || tapped.current) return;
    const openAt = minutesOfClock(day.openingTime);
    const closeAt = minutesOfClock(day.closingTime);
    const now = nowIn(zone);
    const floor = draft.date === now.date ? Math.ceil(now.minutes / 30) * 30 : 0;
    const free = (from: number) =>
      !day.notAvailable.some((run) => run.startMinutes < from + draft.holdMinutes && run.endMinutes > from) &&
      !day.blocks.some((block) => block.startMinutes < from + draft.holdMinutes && block.endMinutes > from);
    let target: number | null = null;
    for (let from = Math.max(wantedStart.current, openAt, floor); from + draft.holdMinutes <= closeAt; from += 30) {
      if (free(from)) {
        target = from;
        break;
      }
    }
    if (target !== null && (target !== draft.startMinutes || !draft.startPicked)) onChange({ ...draft, startMinutes: target, startPicked: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, draft.choice, draft.date, draft.holdMinutes, draft.startMinutes, draft.startPicked]);

  const open = day === null ? 420 : minutesOfClock(day.openingTime);
  const close = day === null ? 1140 : minutesOfClock(day.closingTime);
  const end = draft.startMinutes + draft.holdMinutes;
  const overlapsOff = day !== null && day.notAvailable.some((run) => run.startMinutes < end && run.endMinutes > draft.startMinutes && run.startMinutes < close && run.endMinutes > open);

  function stepDay(delta: -1 | 1) {
    tapped.current = false;
    set({ date: new Date(Date.parse(`${draft.date}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10), startPicked: false });
  }

  return (
    <div>
      <ChoiceCards
        label="Reason"
        id="rv-reason"
        required
        value={draft.reason}
        onChange={(reason) => set({ reason })}
        options={[
          { value: "part_on_order", label: "Part on order" },
          { value: "more_time_needed", label: "More time needed" },
          { value: "other", label: "Other" },
        ]}
      />
      {draft.reason === "other" ? (
        <Field label="What is it?" id="rv-other" required value={draft.otherText} onChange={(e) => set({ otherText: e.target.value })} />
      ) : null}
      <ChoiceCards
        label="Return visit"
        id="rv-choice"
        required
        value={draft.choice}
        onChange={(choice) => set({ choice })}
        options={[
          { value: "pick", label: "I know the time", hint: "Pick a day and a time on your calendar" },
          { value: "notyet", label: "Not yet", hint: "The office books it and tells the customer" },
        ]}
      />
      {draft.choice === "notyet" ? (
        <div className="mb-3.5">
          <label htmlFor="rv-note" className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase">
            Note for the office
          </label>
          <textarea
            id="rv-note"
            rows={3}
            value={draft.officeNote}
            onChange={(e) => set({ officeNote: e.target.value })}
            className="w-full rounded-button border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
          <p className="mt-[5px] text-xs text-muted-text">The office will book the return and tell the customer.</p>
        </div>
      ) : null}
      {draft.choice === "pick" ? (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Day" id="rv-date" type="date" value={draft.date} onChange={(e) => { tapped.current = false; set({ date: e.target.value, startPicked: false }); }} />
            <SelectField label="How long?" id="rv-hold" value={String(draft.holdMinutes)} onChange={(e) => set({ holdMinutes: Number(e.target.value) })} options={holdOptions} />
          </div>
          {error ? <Banner kind="error">{error}</Banner> : null}
          {overlapsOff && !day?.closed ? <Banner kind="warning">You marked this time Not available. Booking will make it available.</Banner> : null}
          {day?.closed ? (
            <div role="status" className="rounded-small-box border border-hairline bg-ground p-4">
              <b className="block text-sm font-extrabold text-ink">
                Closed on {formatDateWithDay(draft.date, zone)} for {day.closed}. Pick another day.
              </b>
            </div>
          ) : (
          <CalendarDayView
            dayLabel={`Your ${formatDateWithDay(draft.date, zone)}`}
            blocks={day?.blocks ?? []}
            notAvailable={day?.notAvailable ?? []}
            allowNotAvailable
            proposedStart={draft.startMinutes}
            proposedEnd={end}
            onPickHalfHour={(minutes) => {
              tapped.current = true;
              wantedStart.current = minutes;
              set({ startMinutes: minutes, startPicked: true });
            }}
            onStepDay={stepDay}
            openMinutes={open}
            closeMinutes={close}
            lastStartMinutes={close - draft.holdMinutes}
            loading={loading}
          />
          )}
          {day?.closed ? null : (
            <p className="mt-2 text-small text-secondary-text">
              {draft.startPicked ? `Return visit: ${timeLabelFor(draft.startMinutes)} to ${timeLabelFor(end)}.` : "Tap a half hour for the start."}
            </p>
          )}
        </>
      ) : error ? (
        <Banner kind="error">{error}</Banner>
      ) : null}
    </div>
  );
}
