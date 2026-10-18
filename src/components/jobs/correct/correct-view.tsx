// The Correct & reissue form -- Feature 6007.
//
// Operations Admin Workflow / Ops job actions / Correct & reissue, On screen. Four Cards: Time on site
// (Time entry rows, no "Now"), Reduce customer price, Why?, and What happens -- plain lines that
// update as Mike types and say only what will really happen. frontend-conventions.md: Templates /
// Layouts (Form page), Molecules / Form pieces (Field, Money field, Time entry row), Molecules /
// Showing values (Value change), Molecules / Actions (Save row, Breadcrumb), Molecules / Messages to
// the person (Toast, Banner).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/auth/banner";
import { PrimaryButton } from "@/components/auth/buttons";
import { Field } from "@/components/auth/field";
import { TimeEntryRows, isBlankRow, rowsFromEntries, type TimeEntryRow } from "@/components/ui/time-entry-rows";
import { ValueChange } from "@/components/ui/value-change";
import { centsToField, typedDollarsToCents } from "@/components/refunds/money";
import { money2 } from "./money";
import type { CorrectionDone, CorrectionForm, FieldError, PreviewResult, WhatHappens } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
/** How long Mike stops typing before the What happens card asks again. */
const PREVIEW_DELAY_MS = 300;

function FormCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-5">
      <h2 className="font-heading text-base font-extrabold text-ink">{title}</h2>
      {note ? <p className="mt-1 text-small text-muted-text">{note}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The body the endpoints take, from what is typed. Anything not yet a usable value is left out, so the card never errors on a half-typed box. */
function bodyOf(form: CorrectionForm, rows: TimeEntryRow[], prices: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (form.timeEntries !== null) {
    const filled = rows.filter((row) => !isBlankRow(row));
    if (filled.length > 0 && filled.every((row) => row.date !== "" && row.start !== "" && row.end !== "")) {
      body["timeEntries"] = filled.map((row) => ({ date: row.date, start: row.start, end: row.end, note: row.note }));
    }
  }
  if (form.prices !== null) {
    const out: Record<string, unknown> = {};
    const parts: Record<string, number> = {};
    const cents = (key: string): number | null => (prices[key] === undefined ? null : typedDollarsToCents(prices[key]));
    const callout = cents("callout");
    if (callout !== null) out["callout"] = callout;
    const hourly = cents("hourly");
    if (hourly !== null) out["hourly"] = hourly;
    for (const part of form.prices.parts) {
      const value = cents(`part:${part.id}`);
      if (value !== null) parts[part.id] = value;
    }
    out["parts"] = parts;
    body["prices"] = out;
  }
  return body;
}

/** Backend field names to the boxes: `timeEntries[2].start` -> `2.start`, `prices.parts.<id>` -> `part:<id>`. */
function boxOf(field: string): string {
  const entry = /^timeEntries\[(\d+)\]\.(\w+)$/.exec(field);
  if (entry) return `${entry[1] ?? ""}.${entry[2] ?? ""}`;
  if (field.startsWith("prices.parts.")) return `part:${field.slice("prices.parts.".length)}`;
  if (field.startsWith("prices.")) return field.slice("prices.".length);
  return field;
}

function WhatHappensCard({ form, what, busy }: { form: CorrectionForm; what: WhatHappens | null; busy: boolean }) {
  return (
    <FormCard title="What happens">
      <div aria-live="polite" aria-busy={busy} data-testid="what-happens" className="flex flex-col gap-2 text-sm text-ink">
        {what === null ? (
          <p className="text-muted-text">Nothing changes yet - change the time or a price.</p>
        ) : (
          <>
            {what.customer.from !== what.customer.to ? (
              <p data-testid="what-customer-money">
                {what.customer.label} <ValueChange from={money2(what.customer.from)} to={money2(what.customer.to)} />
              </p>
            ) : null}
            <p data-testid="what-customer">{what.customer.sentence}</p>
            {what.contractor !== null ? (
              <>
                <p data-testid="what-contractor-money">
                  {what.contractor.label} <ValueChange from={money2(what.contractor.from)} to={money2(what.contractor.to)} />
                </p>
                <p data-testid="what-contractor">{what.contractor.sentence}</p>
              </>
            ) : null}
          </>
        )}
        {form.refundedSoFar > 0 ? (
          <p className="text-small text-muted-text">{money2(form.refundedSoFar)} has already gone back on this invoice.</p>
        ) : null}
      </div>
    </FormCard>
  );
}

export function CorrectView({ form }: { form: CorrectionForm }) {
  const router = useRouter();
  const [rows, setRows] = useState<TimeEntryRow[]>(() => (form.timeEntries === null ? [] : rowsFromEntries(form.timeEntries, form.timezone)));
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    if (form.prices?.callout) start["callout"] = centsToField(form.prices.callout.was);
    if (form.prices?.hourly) start["hourly"] = centsToField(form.prices.hourly.was);
    for (const part of form.prices?.parts ?? []) start[`part:${part.id}`] = centsToField(part.was);
    return start;
  });
  const [reason, setReason] = useState("");
  /** Errors on the time and price boxes, keyed as the boxes are (see boxOf). */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [what, setWhat] = useState<WhatHappens | null>(null);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | undefined>();
  const latest = useRef(0);

  const body = useMemo(() => bodyOf(form, rows, prices), [form, rows, prices]);
  const bodyText = JSON.stringify(body);

  // The What happens card asks the backend again a moment after Mike stops typing; nothing is saved.
  useEffect(() => {
    const id = ++latest.current;
    const timer = setTimeout(() => {
      setAsking(true);
      fetch(`${apiUrl}/api/jobs/${encodeURIComponent(form.reference)}/correct/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: bodyText,
      })
        .then(async (res) => {
          if (id !== latest.current || !res.ok) return;
          const result = (await res.json()) as PreviewResult;
          if ("errors" in result) {
            // A price above the invoice's is shown on its own box, as Mike types it.
            const next: Record<string, string> = {};
            for (const error of result.errors) next[boxOf(error.field)] = error.error;
            setErrors(next);
            setWhat(null);
          } else {
            setErrors({});
            const changed = result.customer.action !== "none" || result.customer.from !== result.customer.to || result.contractor !== null;
            setWhat(changed ? result : null);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (id === latest.current) setAsking(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [bodyText, form.reference]);

  async function save() {
    setBanner(undefined);
    if (reason.trim() === "") {
      setReasonError("Required.");
      document.getElementById("correct-reason")?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(form.reference)}/correct`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, reason: reason.trim() }),
      });
      const payload = (await res.json()) as Partial<CorrectionDone> & { error?: string; field?: string; errors?: FieldError[] };
      if (!res.ok) {
        if (payload.errors && payload.errors.length > 0) {
          const next: Record<string, string> = {};
          for (const error of payload.errors) {
            if (error.field === "reason") setReasonError(error.error);
            else next[boxOf(error.field)] = error.error;
          }
          setErrors(next);
        } else if (payload.field === "reason") {
          setReasonError(payload.error ?? "Required.");
        } else if (payload.field !== undefined && payload.field !== "status") {
          setErrors({ [boxOf(payload.field)]: payload.error ?? "Check this." });
        } else {
          setBanner(payload.error ?? "That did not go through. Please try again.");
        }
        return;
      }
      router.push(`/ops/jobs/${encodeURIComponent(form.reference)}?toast=${encodeURIComponent(payload.toast ?? "Corrected.")}`);
    } catch {
      setBanner("That did not go through - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const timeErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) if (/^\d+\./.test(key)) timeErrors[key] = value;
  if (errors["timeEntries"]) timeErrors["rows"] = errors["timeEntries"];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-4"
    >
      {banner ? <Banner kind="error">{banner}</Banner> : null}

      {form.timeEntries !== null ? (
        <FormCard title="Time on site">
          <TimeEntryRows rows={rows} zone={form.timezone} idPrefix="correct-entry" errors={timeErrors} showNow={false} onChange={setRows} />
        </FormCard>
      ) : null}

      {form.prices !== null ? (
        <FormCard title="Reduce customer price" note="Reduce customer price as goodwill. Prices can only go down. Contractor payout is not affected.">
          {form.prices.callout ? (
            <Field
              id="correct-callout"
              label={form.prices.callout.label}
              prefix="$"
              inputMode="decimal"
              value={prices["callout"] ?? ""}
              onChange={(event) => setPrices({ ...prices, callout: event.target.value })}
              error={errors["callout"]}
              helper={`was ${money2(form.prices.callout.was)}`}
            />
          ) : null}
          {form.prices.hourly ? (
            <Field
              id="correct-hourly"
              label={form.prices.hourly.label}
              prefix="$"
              inputMode="decimal"
              value={prices["hourly"] ?? ""}
              onChange={(event) => setPrices({ ...prices, hourly: event.target.value })}
              error={errors["hourly"]}
              helper={`was ${money2(form.prices.hourly.was)}`}
            />
          ) : null}
          {form.prices.parts.map((part) => (
            <Field
              key={part.id}
              id={`correct-part-${part.id}`}
              label={part.label}
              prefix="$"
              inputMode="decimal"
              value={prices[`part:${part.id}`] ?? ""}
              onChange={(event) => setPrices({ ...prices, [`part:${part.id}`]: event.target.value })}
              error={errors[`part:${part.id}`]}
              helper={`was ${money2(part.was)}`}
            />
          ))}
        </FormCard>
      ) : (
        <FormCard title="Prices">
          <p className="text-small text-muted-text" data-testid="no-prices">
            {form.kind === "void"
              ? "This invoice was voided, so there is no price to lower. Only the time can change."
              : "This invoice is $0, so there is no price to lower. Only the time can change."}
          </p>
        </FormCard>
      )}

      <FormCard title="Why?">
        <label
          htmlFor="correct-reason"
          className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']"
        >
          Reason
        </label>
        <textarea
          id="correct-reason"
          rows={3}
          maxLength={500}
          value={reason}
          aria-required
          aria-invalid={reasonError ? true : undefined}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(undefined);
          }}
          className={`w-full rounded-button border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            reasonError ? "border-brand-destructive" : "border-hairline"
          }`}
        />
        {reasonError ? (
          <p className="mt-[5px] text-xs text-brand-destructive">{reasonError}</p>
        ) : (
          <p className="mt-[5px] text-xs text-muted-text">Internal note. Neither the customer nor {form.contractorFirstName} sees this. Say what happened.</p>
        )}
      </FormCard>

      <WhatHappensCard form={form} what={what} busy={asking} />

      <div className="flex justify-end gap-2.5">
        <Link
          href={`/ops/jobs/${encodeURIComponent(form.reference)}`}
          className="inline-flex min-h-11 items-center rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink"
        >
          Cancel
        </Link>
        <PrimaryButton size="compact" loading={saving} loadingLabel="Correcting...">
          Correct &amp; reissue
        </PrimaryButton>
      </div>
    </form>
  );
}
