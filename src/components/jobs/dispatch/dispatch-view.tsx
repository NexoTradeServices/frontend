// The dispatch page -- Feature 4002, dispatch to assignment.
//
// Dispatch Logic / MVP -- Manual: the slot first, then the candidate list in
// two groups (pickable first, nearest first), picking a contractor opens
// his day, the service level follows the date (Emergency the one hand
// override), the price shown, then Send it.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fullAddress } from "@/components/ui/places-field";
import { CalendarDayView, timeLabelFor, type DayBlock } from "@/components/ui/calendar-day-view";
import { PrimaryButton } from "@/components/auth/buttons";
import {
  LEVEL_LABELS,
  moneyCents,
  type CandidateRow,
  type CandidatesResponse,
  type DispatchFacts,
} from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const START_MINUTES: number[] = [];
for (let m = 360; m <= 1230; m += 30) START_MINUTES.push(m); // 6:00am - 8:30pm
const HOLD_MINUTES: number[] = [];
for (let m = 60; m <= 480; m += 30) HOLD_MINUTES.push(m); // 1 - 8 hours

function holdLabel(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? String(hours) : hours.toFixed(1)} ${minutes === 60 ? "hour" : "hours"}`;
}

function weekdayNameOf(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
}

function shortDateOf(date: string): string {
  const [year, month, day] = date.split("-");
  const weekday = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-AU", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${day}/${month}/${(year ?? "").slice(2)}`;
}

function addDays(date: string, delta: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + delta);
  return next.toISOString().slice(0, 10);
}

function Card({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-hairline bg-surface p-5">
      <h2 className="mb-3 font-heading text-base font-extrabold text-ink">
        {title}
        {aside ? <small className="ml-1.5 font-body text-xs font-normal text-muted-text">{aside}</small> : null}
      </h2>
      {children}
    </section>
  );
}

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";

function CandidateRowButton({
  row,
  picked,
  onPick,
}: {
  row: CandidateRow;
  picked: boolean;
  onPick: () => void;
}) {
  const grey = row.why !== null;
  const openable = row.ready; // AC19: busy still opens; Not ready does not
  const distanceText = row.distanceKm === null ? "No service area" : `${row.distanceKm.toFixed(1)} km to job site`;
  const payText = `${moneyCents(row.pay.calloutRate)} first hour, then ${moneyCents(row.pay.standardRate)}/h`;
  const ratingText = row.rating ? ` - ${row.rating.average.toFixed(1)} (${String(row.rating.count)} reviews)` : "";

  return (
    <button
      type="button"
      onClick={openable ? onPick : undefined}
      aria-disabled={!openable}
      className={`mb-2.5 block w-full rounded-[10px] border p-3.5 text-left ${
        picked ? "border-2 border-brand-accent p-[13px]" : "border-hairline"
      } ${grey ? "bg-ground" : "bg-surface"} ${openable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-heading text-[13px] font-extrabold text-ink">{row.code}</span>
        <span
          className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase ${
            row.ready ? "bg-success-bg text-brand-success" : "bg-warning-bg text-brand-warning"
          }`}
        >
          {row.ready ? "Ready to dispatch" : "Not ready to dispatch"}
        </span>
      </div>
      <div className={`mb-0.5 font-heading text-[15px] font-extrabold ${grey ? "text-muted-text" : "text-ink"}`}>
        {row.name}
      </div>
      <div className="text-xs text-muted-text">
        <div className="tabular-nums">
          {distanceText} - {payText}
          {ratingText}
        </div>
        {row.why ? <div className="font-semibold text-brand-warning">{row.why}</div> : null}
      </div>
    </button>
  );
}

export function DispatchView({ initial }: { initial: DispatchFacts }) {
  const router = useRouter();
  const [date, setDate] = useState(initial.defaults.date);
  const [startMinutes, setStartMinutes] = useState(initial.defaults.startMinutes);
  const [holdMinutes, setHoldMinutes] = useState(initial.defaults.holdMinutes);
  const [emergency, setEmergency] = useState(false);
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [dayBlocks, setDayBlocks] = useState<DayBlock[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    // The fetch (and its own "now loading" flag) starts on the next tick,
    // never synchronously inside the effect body -- setting state directly
    // there risks a cascading render (same reasoning as job-queue.tsx's
    // search debounce, just with no delay to wait out).
    const timer = window.setTimeout(() => {
      setCandidatesLoading(true);
      const params = new URLSearchParams({
        date,
        startMinutes: String(startMinutes),
        holdMinutes: String(holdMinutes),
        emergency: String(emergency),
      });
      fetch(`${apiUrl}/api/jobs/${encodeURIComponent(initial.reference)}/dispatch/candidates?${params.toString()}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? (res.json() as Promise<CandidatesResponse>) : null))
        .then((body) => {
          if (!cancelled) setCandidates(body);
        })
        .catch(() => {
          if (!cancelled) setCandidates(null);
        })
        .finally(() => {
          if (!cancelled) setCandidatesLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initial.reference, date, startMinutes, holdMinutes, emergency]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!pickedCode) {
        setDayBlocks([]);
        return;
      }
      setDayLoading(true);
      fetch(`${apiUrl}/api/contractors/${encodeURIComponent(pickedCode)}/day?date=${date}`, { credentials: "include" })
        .then((res) => (res.ok ? (res.json() as Promise<{ blocks: DayBlock[] }>) : null))
        .then((body) => {
          if (!cancelled) setDayBlocks(body?.blocks ?? []);
        })
        .catch(() => {
          if (!cancelled) setDayBlocks([]);
        })
        .finally(() => {
          if (!cancelled) setDayLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pickedCode, date]);

  const allRows = candidates ? [...candidates.serves, ...candidates.outside] : [];
  const pickedRow = allRows.find((row) => row.code === pickedCode) ?? null;
  const canGo = pickedRow !== null && pickedRow.pickable;

  function stepDay(delta: -1 | 1) {
    setDate((current) => addDays(current, delta));
  }

  function pickHalfHour(minutes: number) {
    setStartMinutes(minutes);
  }

  async function dispatch() {
    if (!pickedRow) return;
    setDispatching(true);
    setDispatchError(undefined);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(initial.reference)}/dispatch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorCode: pickedRow.code, date, startMinutes, holdMinutes, emergency }),
      });
      const payload = (await res.json()) as { toast?: string; error?: string };
      if (!res.ok) {
        setDispatchError(payload.error ?? "Dispatch failed.");
        return;
      }
      router.push(`/ops/jobs/${encodeURIComponent(initial.reference)}?toast=${encodeURIComponent(payload.toast ?? "")}`);
    } catch {
      setDispatchError("Dispatch failed - check your connection and try again.");
    } finally {
      setDispatching(false);
    }
  }

  const level = candidates?.level ?? "normal";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* Mobile stack order: The job, When, Contractors, Service level and
          price, Send it -- job context first for orientation, then the
          task flow (slot, who, price, dispatch). Desktop's two-column
          arrangement (When+Contractors left, The job+Service level+Send it
          right) is unchanged via the explicit xl: column/row placement. */}
      <div className="order-2 min-w-0 xl:order-none xl:col-start-1 xl:row-start-1">
        <Card title="When" aside="the proposed slot">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            <div>
              <label htmlFor="dispatch-date" className={`mb-[5px] ${labelClass}`}>
                Day
              </label>
              <input
                id="dispatch-date"
                type="date"
                value={date}
                onChange={(event) => event.target.value && setDate(event.target.value)}
                className="min-h-11 w-full rounded-md border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
            <div>
              <label htmlFor="dispatch-start" className={`mb-[5px] ${labelClass}`}>
                Start (AWST)
              </label>
              <select
                id="dispatch-start"
                value={startMinutes}
                onChange={(event) => setStartMinutes(Number(event.target.value))}
                className="min-h-11 w-full rounded-md border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              >
                {START_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {timeLabelFor(minutes)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dispatch-hold" className={`mb-[5px] ${labelClass}`}>
                Hold
              </label>
              <select
                id="dispatch-hold"
                value={holdMinutes}
                onChange={(event) => setHoldMinutes(Number(event.target.value))}
                className="min-h-11 w-full rounded-md border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              >
                {HOLD_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {holdLabel(minutes)}
                  </option>
                ))}
              </select>
              <p className="mt-[5px] text-xs text-muted-text">On the contractor&apos;s calendar only. The customer is told the start.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="order-3 min-w-0 xl:order-none xl:col-start-1 xl:row-start-2">
        <Card title="Contractors" aside={`${initial.trade} - ${shortDateOf(date)}, ${timeLabelFor(startMinutes)}-${timeLabelFor(startMinutes + holdMinutes)} AWST`}>
          {candidatesLoading && !candidates ? (
            <p className="text-[13px] text-muted-text">Loading candidates...</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
                <h3 className="text-[13px] font-extrabold tracking-[0.06em] text-ink uppercase">Serve this postcode</h3>
              </div>
              {candidates && candidates.serves.length > 0 ? (
                candidates.serves.map((row) => (
                  <div key={row.code}>
                    <CandidateRowButton row={row} picked={pickedCode === row.code} onPick={() => setPickedCode((c) => (c === row.code ? null : row.code))} />
                    {pickedCode === row.code ? (
                      <CalendarDayView
                        dayLabel={`${row.name.split(" ")[0] ?? row.name}'s ${shortDateOf(date)}`}
                        blocks={dayBlocks}
                        proposedStart={startMinutes}
                        proposedEnd={startMinutes + holdMinutes}
                        onPickHalfHour={pickHalfHour}
                        onStepDay={stepDay}
                        loading={dayLoading}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[10px] border border-dashed border-hairline p-3.5 text-[13px] text-muted-text">
                  No contractors list {initial.suburb} for {initial.trade}. See the nearest match below.
                </div>
              )}

              <div className="mt-4.5 mb-2 flex flex-wrap items-baseline gap-2.5">
                <h3 className="text-[13px] font-extrabold tracking-[0.06em] text-ink uppercase">Outside their area</h3>
                <span className="text-xs text-muted-text">Same trade, nearest first. Confirm availability before dispatch.</span>
              </div>
              {candidates && candidates.outside.length > 0 ? (
                candidates.outside.map((row) => (
                  <div key={row.code}>
                    <CandidateRowButton row={row} picked={pickedCode === row.code} onPick={() => setPickedCode((c) => (c === row.code ? null : row.code))} />
                    {pickedCode === row.code ? (
                      <CalendarDayView
                        dayLabel={`${row.name.split(" ")[0] ?? row.name}'s ${shortDateOf(date)}`}
                        blocks={dayBlocks}
                        proposedStart={startMinutes}
                        proposedEnd={startMinutes + holdMinutes}
                        onPickHalfHour={pickHalfHour}
                        onStepDay={stepDay}
                        loading={dayLoading}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[10px] border border-dashed border-hairline p-3.5 text-[13px] text-muted-text">
                  No other {initial.trade.toLowerCase()} contractors.
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="order-1 min-w-0 xl:order-none xl:col-start-2 xl:row-start-1">
        <Card title="The job" aside={initial.customerName}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4.5 gap-y-3">
            <div>
              <span className={labelClass}>Trade</span>
              <div className="font-semibold text-ink">{initial.trade}</div>
            </div>
            <div className="col-span-full">
              <span className={labelClass}>Job site</span>
              <div className="font-normal text-ink">{initial.siteAddress ? fullAddress(initial.siteAddress) : "-"}</div>
            </div>
            {initial.description ? (
              <div className="col-span-full">
                <span className={labelClass}>Issue Description</span>
                <p className="font-normal text-ink">{initial.description}</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="order-4 min-w-0 xl:order-none xl:col-start-2 xl:row-start-2">
        <Card title="Service level and price">
          <span className={labelClass}>Service level</span>
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-hairline bg-ground px-2.5 py-2 text-sm tabular-nums text-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0 text-muted-text" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
            {LEVEL_LABELS[emergency ? "emergency" : level]} - {weekdayNameOf(date)}
          </div>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              className="size-5 accent-brand-accent"
              checked={emergency}
              onChange={(event) => setEmergency(event.target.checked)}
            />
            <span className="font-bold">Emergency</span>
          </label>
          {candidates ? (
            <div className="mt-3 rounded-lg border border-hairline bg-ground p-3.5">
              <span className={labelClass}>Price to quote the customer</span>
              <div className="font-heading text-lg font-extrabold tabular-nums text-ink">
                First hour (includes call-out) {candidates.price.calloutRate}, then {candidates.price.standardRate}/h
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="order-5 min-w-0 xl:order-none xl:col-start-2 xl:row-start-3">
        <Card title="Send it">
          <div className="mb-3 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div>
              <span className={labelClass}>Contractor</span>
              <div className="text-secondary-text">{pickedRow ? pickedRow.name : "Not picked yet"}</div>
            </div>
            <div>
              <span className={labelClass}>Day</span>
              <div className="tabular-nums text-secondary-text">{shortDateOf(date)}</div>
            </div>
            <div>
              <span className={labelClass}>Time</span>
              <div className="tabular-nums text-secondary-text">
                {timeLabelFor(startMinutes)}-{timeLabelFor(startMinutes + holdMinutes)} AWST
              </div>
            </div>
            <div>
              <span className={labelClass}>Level</span>
              <div className="text-secondary-text">{LEVEL_LABELS[emergency ? "emergency" : level]}</div>
            </div>
          </div>
          {dispatchError ? <p className="mb-2 text-xs text-brand-destructive">{dispatchError}</p> : null}
          <div className="flex flex-col gap-2 border-t border-hairline pt-3.5 md:flex-row md:items-center md:justify-end md:gap-3">
            <span className="text-xs text-muted-text md:order-1">
              {canGo
                ? `An email and text will be sent to ${pickedRow?.name.split(" ")[0]} to accept or decline. ${initial.customerName.split(" ")[0]} will not be notified until he accepts.`
                : pickedRow
                  ? `Not available at this time. Choose a different slot or contractor.`
                  : "Select a contractor above."}
            </span>
            {canGo || dispatching ? (
              <PrimaryButton
                type="button"
                onClick={() => void dispatch()}
                loading={dispatching}
                loadingLabel="Dispatching..."
                size="compact"
                className="md:order-2"
              >
                {pickedRow ? `Dispatch to ${pickedRow.name.split(" ")[0] ?? pickedRow.name}` : "Dispatch"}
              </PrimaryButton>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-[52px] w-full rounded-md border border-hairline bg-ground px-4 text-sm font-bold text-muted-text md:order-2 md:min-h-11 md:w-auto md:px-[18px]"
              >
                Dispatch
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
