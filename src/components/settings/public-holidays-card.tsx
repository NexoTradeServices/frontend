// The Public holidays card on Settings -- Feature 1020.
//
// Calendar & Scheduling / Public holidays: the owner keeps a list of public holidays per state and
// year. Each action (Add holiday, Remove, Remove all) is its own call, outside the page's Save, like
// the agreement card. The card has an id so a Needs attention link can land on it with the state and
// year already chosen (`?holidayState=WA&holidayYear=2028#public-holidays`).
"use client";

import { useCallback, useEffect, useState } from "react";
import { Field } from "@/components/auth/field";
import { Banner } from "@/components/auth/banner";
import { SelectField } from "@/components/ui/select-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/date-format";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
/** A state's list counts as short below this (the server's MINIMUM_HOLIDAYS). */
const MINIMUM_HOLIDAYS = 7;

const STATE_OPTIONS = ["WA", "NSW", "VIC", "QLD", "SA", "TAS", "ACT", "NT"].map((value) => ({ value, label: value }));

interface HolidayDto {
  id: string;
  state: string;
  date: string;
  name: string;
}

const textButton = "min-h-11 py-2.5 text-small font-semibold text-secondary-text underline underline-offset-2";
const arrowButton =
  "flex min-h-11 min-w-11 items-center justify-center rounded-button border border-hairline bg-surface text-base font-bold text-ink";

export function PublicHolidaysCard({
  timezone,
  initialState = "WA",
  initialYear,
}: {
  timezone: string;
  initialState?: string;
  initialYear?: number;
}) {
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(new Date()),
  );
  const [state, setState] = useState(STATE_OPTIONS.some((o) => o.value === initialState) ? initialState : "WA");
  const [year, setYear] = useState(initialYear ?? currentYear);
  const [holidays, setHolidays] = useState<HolidayDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ date?: string; name?: string }>({});
  const [success, setSuccess] = useState<string | undefined>();
  const [bookedWarning, setBookedWarning] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async (forState: string, forYear: number): Promise<HolidayDto[] | null> => {
    try {
      const res = await fetch(`${apiUrl}/api/holidays?state=${forState}&year=${String(forYear)}`, { credentials: "include" });
      if (!res.ok) return null;
      return ((await res.json()) as { holidays: HolidayDto[] }).holidays;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let live = true;
    void load(state, year).then((result) => {
      if (!live) return;
      setHolidays(result);
      setLoadFailed(result === null);
    });
    return () => {
      live = false;
    };
  }, [state, year, load]);

  function clearMessages() {
    setSuccess(undefined);
    setBookedWarning(undefined);
    setProblem(undefined);
    setErrors({});
  }

  function changeView(nextState: string, nextYear: number) {
    clearMessages();
    setHolidays(null);
    setState(nextState);
    setYear(nextYear);
  }

  async function refresh() {
    const result = await load(state, year);
    setHolidays(result);
    setLoadFailed(result === null);
  }

  async function add() {
    clearMessages();
    const next: { date?: string; name?: string } = {};
    if (date === "") next.date = "Required.";
    if (name.trim() === "") next.name = "Required.";
    if (next.date || next.name) {
      setErrors(next);
      return;
    }
    setWorking(true);
    try {
      const res = await fetch(`${apiUrl}/api/holidays`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, date, name: name.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string; bookedJobs?: number };
      if (!res.ok) {
        if (body.field === "date") setErrors({ date: body.error });
        else if (body.field === "name") setErrors({ name: body.error });
        else setProblem(body.error ?? "Couldn't add the holiday - try again shortly.");
        return;
      }
      setSuccess(`Added ${name.trim()}.`);
      if ((body.bookedJobs ?? 0) > 0) {
        const n = body.bookedJobs ?? 0;
        setBookedWarning(`${String(n)} ${n === 1 ? "job is" : "jobs are"} already booked that day`);
      }
      setDate("");
      setName("");
      // A holiday added for another year than the one on show moves the view to it.
      const addedYear = Number(date.slice(0, 4));
      if (addedYear !== year) setYear(addedYear);
      else await refresh();
    } catch {
      setProblem("Couldn't add the holiday - check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function remove(holiday: HolidayDto) {
    clearMessages();
    setWorking(true);
    try {
      const res = await fetch(`${apiUrl}/api/holidays/${holiday.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setProblem("Couldn't remove the holiday - try again shortly.");
        return;
      }
      setSuccess(`Removed ${holiday.name}.`);
      await refresh();
    } catch {
      setProblem("Couldn't remove the holiday - check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function removeAll() {
    setWorking(true);
    clearMessages();
    try {
      const res = await fetch(`${apiUrl}/api/holidays?state=${state}&year=${String(year)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setProblem(body.error ?? "Couldn't remove the holidays - try again shortly.");
        return;
      }
      setSuccess(`Removed all ${state} ${String(year)} holidays.`);
      await refresh();
    } catch {
      setProblem("Couldn't remove the holidays - check your connection and try again.");
    } finally {
      setWorking(false);
      setConfirmOpen(false);
    }
  }

  const count = holidays?.length ?? 0;
  const finished = year < currentYear;

  return (
    <div id="public-holidays" className="mb-4.5 rounded-card border border-hairline bg-surface p-4 sm:p-5">
      <h3 className="font-heading text-base font-extrabold text-ink">Public holidays</h3>
      <p className="mb-3.5 text-xs text-muted-text">
        The business is closed on these days. Nothing can be dispatched or booked for them.
      </p>

      <div className="mb-1 flex flex-wrap items-end gap-4">
        <div className="min-w-[140px]">
          <SelectField
            id="holidayState"
            label="State"
            options={STATE_OPTIONS}
            value={state}
            onChange={(e) => changeView(e.target.value, year)}
          />
        </div>
        <div className="mb-3.5 flex items-center gap-1.5">
          <button type="button" aria-label="Previous year" className={arrowButton} onClick={() => changeView(state, year - 1)}>
            <span aria-hidden>&#8249;</span>
          </button>
          <span className="min-w-14 text-center font-heading text-base font-extrabold tabular-nums text-ink" aria-live="polite">
            {year}
          </span>
          <button type="button" aria-label="Next year" className={arrowButton} onClick={() => changeView(state, year + 1)}>
            <span aria-hidden>&#8250;</span>
          </button>
        </div>
      </div>

      {holidays !== null && count < MINIMUM_HOLIDAYS && !finished ? (
        <Banner kind="warning">
          {count === 0
            ? `No holidays entered for ${state} ${String(year)}. Add them so jobs can't be booked on those days.`
            : `${state} ${String(year)} has fewer than ${String(MINIMUM_HOLIDAYS)} holidays. Check the list is complete.`}
        </Banner>
      ) : null}
      {success ? <Banner kind="success">{success}</Banner> : null}
      {bookedWarning ? <Banner kind="warning">{bookedWarning}</Banner> : null}
      {problem ? <Banner kind="error">{problem}</Banner> : null}

      {loadFailed ? (
        <p className="text-small text-brand-destructive">Couldn&apos;t load the holidays - try again shortly.</p>
      ) : holidays === null ? (
        <div aria-hidden="true" className="h-10 rounded-button bg-ground" />
      ) : holidays.length === 0 ? (
        <p className="text-small text-muted-text">No holidays entered for {state} {year}.</p>
      ) : (
        <ul className="m-0 list-none p-0" aria-label={`${state} ${String(year)} holidays`}>
          {holidays.map((holiday) => (
            <li
              key={holiday.id}
              className="flex items-center justify-between gap-3 border-t border-hairline first:border-t-0"
            >
              <span className="min-w-0 py-2.5 text-sm text-ink">
                <b className="mr-2 tabular-nums">{formatDate(holiday.date)}</b>
                {holiday.name}
              </span>
              <button
                type="button"
                className={textButton}
                disabled={working}
                aria-label={`Remove ${holiday.name} ${formatDate(holiday.date)}`}
                onClick={() => void remove(holiday)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <hr className="mt-3.5 mb-3 border-0 border-t border-hairline" />

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[160px] flex-1">
          <Field
            id="holidayDate"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((current) => ({ ...current, date: undefined }));
            }}
            error={errors.date}
          />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <Field
            id="holidayName"
            label="Holiday name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            error={errors.name}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={working}
        onClick={() => void add()}
        className="min-h-[52px] w-full rounded-button border border-hairline bg-surface px-4 py-3.5 text-sm font-bold text-ink sm:min-h-11 sm:w-auto sm:py-2.5"
      >
        Add holiday
      </button>

      {finished && holidays !== null && holidays.length > 0 ? (
        <div className="mt-2">
          <button type="button" className={textButton} disabled={working} onClick={() => setConfirmOpen(true)}>
            Remove all {state} {year} holidays
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={`Remove all ${state} ${String(year)} holidays?`}
        confirmLabel="Remove all"
        loading={working}
        loadingLabel="Removing..."
        onConfirm={() => void removeAll()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>
          The {year} list for {state} is finished. Jobs already booked do not change.
        </p>
      </ConfirmDialog>
    </div>
  );
}
