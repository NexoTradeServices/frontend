// The job page's cards -- Feature 4001, ops job queue and job detail.
//
// Operations Admin Workflow / The job queue and the job page: "The job page
// is where the confirming call is captured." Left, what the customer asked
// for (read-only) and who is on it; right, who they are, the Addresses card
// (billing + the tick box + site, ONE Save -- Portal form screens) and the
// operator notes log (a stacked add form at every width, newest first, the
// author's Edit for 10 minutes, "(edited)").
//
// Feature 4008: the Addresses card gains the site contact (name, phone,
// email) under the same one Save, and the Messages card lists every message
// sent about the job -- to whom, email or text, when, what, where it stands.
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlacesField, fullAddress, type PickedAddress } from "@/components/ui/places-field";
import { LockedField } from "@/components/ui/locked-field";
import { SelectField } from "@/components/ui/select-field";
import { PrimaryButton, PrimaryLink } from "@/components/auth/buttons";
import { Field } from "@/components/auth/field";
import { ReadOnlyPhotoGallery } from "@/components/ui/photo-gallery";
import { ErrorToast, Toast, useToast } from "@/components/ui/toast";
import { TimeEntryRows, isBlankRow, rowsFromEntries, type TimeEntryRow } from "@/components/ui/time-entry-rows";
import { formatHours } from "@/lib/billed-hours";
import { formatDollars } from "@/components/request-a-job/money";
import type { ApiError, EarlierBooking, InvoiceView, JobDetail, MessageView, NoteView, VisitView } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";

function Card({
  title,
  aside,
  subtitle,
  children,
}: {
  title: string;
  aside?: string;
  /** Shown on its own line under the title, instead of inline beside it. */
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-hairline bg-surface p-5">
      <h2 className="font-heading text-base font-extrabold text-ink">
        {title}
        {aside ? <small className="ml-1.5 font-body text-xs font-normal text-muted-text">{aside}</small> : null}
      </h2>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-text">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "col-span-full" : undefined}>
      <span className={labelClass}>{label}</span>
      <div className="font-semibold text-ink">{children}</div>
    </div>
  );
}

function RequestCard({ job }: { job: JobDetail }) {
  return (
    <Card title="The request">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4.5 gap-y-3">
        <Fact label="Trade">{job.trade}</Fact>
        <Fact label="Suburb">
          {job.suburb} {job.postcode}
        </Fact>
        <Fact label="Preferred">
          <div className="tabular-nums">{job.wantedDate}</div>
          <div className="text-xs font-normal text-muted-text tabular-nums">{job.windowLabel}</div>
        </Fact>
        <Fact label="Arrived by">{job.source === "web" ? "Web form" : "Phone"}</Fact>
        <Fact label="Issue Description" wide>
          <p className="max-w-[62ch] font-normal whitespace-pre-wrap">{job.description ?? "-"}</p>
        </Fact>
        <Fact label="Additional questions" wide>
          {job.answers.length > 0 ? (
            <ul className="list-disc pl-4.5 font-normal">
              {job.answers.map((answer) => (
                <li key={answer}>{answer}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] font-normal text-muted-text">None answered</p>
          )}
        </Fact>
        <Fact label="Photos" wide>
          {job.photos.length > 0 ? (
            <ReadOnlyPhotoGallery photos={job.photos} />
          ) : (
            <p className="text-[13px] font-normal text-muted-text">No photos</p>
          )}
        </Fact>
      </div>
    </Card>
  );
}

const LEVEL_LABELS: Record<"normal" | "weekend" | "emergency", string> = {
  normal: "Normal",
  weekend: "Weekend",
  emergency: "Emergency",
};

/**
 * Feature 4003, Quick fixes: the job actions the platform has not built yet,
 * each shown only where it would work, outlined, greyed and disabled, naming
 * the feature that switches it on. Architect skill, Writing the plan, step 2a.
 */
const ACTION_PLACEHOLDERS: { label: string; feature: string; statuses: JobDetail["status"][] }[] = [
  { label: "Edit", feature: "4004", statuses: ["new"] },
  { label: "Reassign", feature: "4006", statuses: ["assigned", "scheduled"] },
  { label: "Reschedule", feature: "4006", statuses: ["assigned", "scheduled"] },
  { label: "On hold", feature: "5002", statuses: ["scheduled", "in_progress"] },
  { label: "Mark no-show", feature: "6005", statuses: ["scheduled", "in_progress"] },
  { label: "Raise callback", feature: "6004", statuses: ["completed"] },
  { label: "Correct and reissue", feature: "6007", statuses: ["completed"] },
  { label: "Cancel", feature: "4006", statuses: ["new", "assigned", "scheduled"] },
];

function ActionPlaceholders({ job }: { job: JobDetail }) {
  const shown = ACTION_PLACEHOLDERS.filter((action) => action.statuses.includes(job.status));
  if (shown.length === 0) return null;
  return (
    <div className="mt-3.5 flex flex-wrap gap-2 border-t border-hairline pt-3" data-testid="action-placeholders">
      {shown.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled
          className="min-h-11 rounded-md border border-hairline bg-transparent px-3.5 text-[13px] font-bold text-muted-text"
        >
          {action.label} - coming in {action.feature}
        </button>
      ))}
    </div>
  );
}

/** Feature 4003, plan decision 10: every booking on the job but the one in play, newest first. */
function EarlierBookings({ bookings }: { bookings: EarlierBooking[] }) {
  if (bookings.length === 0) return null;
  return (
    <div className="mt-3.5 flex flex-col gap-2 border-t border-hairline pt-3" data-testid="earlier-bookings">
      <span className={labelClass}>Earlier bookings</span>
      {bookings.map((booking, index) => (
        <div key={index} className="text-[13px]">
          <div className="text-ink">
            <b>{booking.contractorName}</b> <span className="text-secondary-text">{booking.contractorCode}</span> -{" "}
            {booking.what.toLowerCase()} <span className="tabular-nums">{booking.whenLabel}</span>
          </div>
          <div className="text-secondary-text">
            {booking.slotLabel ? <span className="tabular-nums">For {booking.slotLabel}.</span> : null}
            {booking.note ? <> &ldquo;{booking.note}&rdquo;</> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContractorCard({ job }: { job: JobDetail }) {
  return (
    <Card title="Contractor">
      {job.contractor ? (
        <div className="grid gap-3">
          <Fact label="Assigned to">
            {job.contractor.name} <span className="text-xs font-normal text-muted-text">{job.contractor.code}</span>
          </Fact>
          <Fact label="Status">
            <span className="tabular-nums">{job.contractor.standing}</span>
          </Fact>
          {job.priceLine && job.serviceLevel ? (
            <Fact label="Service level">
              {LEVEL_LABELS[job.serviceLevel]} <span className="font-normal text-muted-text">- {job.priceLine}</span>
            </Fact>
          ) : null}
        </div>
      ) : job.canDispatch ? (
        <>
          <p className="mb-2 text-[13px] text-muted-text">Not dispatched yet.</p>
          <PrimaryLink
            href={`/ops/jobs/${encodeURIComponent(job.reference)}/dispatch`}
            className="md:mt-0 md:inline-block md:min-h-11 md:w-auto md:px-[18px] md:py-2.5"
          >
            Dispatch
          </PrimaryLink>
        </>
      ) : job.dispatchBlockedReason ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-text">Not dispatched yet.</p>
          <p className="text-xs text-brand-warning">{job.dispatchBlockedReason}</p>
          <button
            type="button"
            disabled
            className="min-h-[52px] w-full rounded-md border border-hairline bg-ground px-4 text-sm font-bold text-muted-text md:min-h-11 md:w-auto md:px-[18px]"
          >
            Dispatch
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-muted-text">Not dispatched yet.</p>
      )}
      <EarlierBookings bookings={job.earlierBookings} />
      <ActionPlaceholders job={job} />
    </Card>
  );
}

/**
 * Feature 5001: "Time on site" -- Mike changes the time entries until Complete
 * (for when Bob rings from the van); once completed it is read-only and also
 * shows the completion notes and the parts, as the frozen record.
 */
function TimeOnSiteCard({
  job,
  visit,
  onSaved,
}: {
  job: JobDetail;
  visit: VisitView;
  onSaved: (next: JobDetail, message: string) => void;
}) {
  const zone = visit.timezone;
  const [rows, setRows] = useState<TimeEntryRow[]>(() => rowsFromEntries(visit.timeEntries, zone));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const snapshot = (list: TimeEntryRow[]) =>
    JSON.stringify(list.filter((row) => !isBlankRow(row)).map((row) => [row.date, row.start, row.end, row.note.trim()]));
  const stored = snapshot(rowsFromEntries(visit.timeEntries, zone));
  const pending = snapshot(rows) !== stored;

  async function save() {
    const sent = rows.map((row, index) => ({ row, index })).filter(({ row }) => !isBlankRow(row));
    const problems: Record<string, string> = {};
    for (const { row, index } of sent) {
      if (row.date === "") problems[`${String(index)}.date`] = "Required.";
      if (row.start === "") problems[`${String(index)}.start`] = "Required.";
      if (row.end === "") problems[`${String(index)}.end`] = "Required.";
      else if (row.start !== "" && row.end <= row.start) problems[`${String(index)}.end`] = "Finish must be after start.";
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setFormError(undefined);
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/time-entries`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntries: sent.map(({ row }) => ({ date: row.date, start: row.start, end: row.end, note: row.note })),
        }),
      });
      const payload = (await res.json()) as JobDetail & ApiError;
      if (!res.ok) {
        const at = /^timeEntries\[(\d+)\]\.(\w+)$/.exec(payload.field ?? "");
        if (at) setErrors({ [`${String(sent[Number(at[1])]?.index ?? 0)}.${at[2] ?? ""}`]: payload.error });
        else setFormError(payload.error);
        return;
      }
      onSaved(payload, `Saved the time on site for ${job.reference}.`);
    } catch {
      setFormError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (visit.completed) {
    return (
      <Card title="Time on site" aside={`Billed ${formatHours(visit.billedHours)}h`}>
        <TimeEntryRows rows={rowsFromEntries(visit.timeEntries, zone)} mode="facts" zone={zone} idPrefix="ops-entry" noteLabel="Contractor's visit note" />
        <div className="mt-3.5 border-t border-hairline pt-3.5">
          <Fact label="Contractor work summary">
            <p className="max-w-[62ch] font-normal whitespace-pre-wrap">{visit.completionNotes === "" ? "-" : visit.completionNotes}</p>
          </Fact>
        </div>
        <div className="mt-3.5 border-t border-hairline pt-3.5">
          <span className={labelClass}>Parts</span>
          {visit.parts.length === 0 ? (
            <p className="mt-1 text-[13px] text-muted-text">No parts.</p>
          ) : (
            <table className="mt-1.5 w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className={`${labelClass} pb-1.5 font-bold`}>Part</th>
                  <th className={`${labelClass} pb-1.5 text-right font-bold`}>Qty</th>
                  <th className={`${labelClass} pb-1.5 text-right font-bold`}>Price each</th>
                  <th className={`${labelClass} pb-1.5 text-right font-bold`}>Line total</th>
                </tr>
              </thead>
              <tbody>
                {visit.parts.map((part, index) => (
                  <tr key={index} className="border-t border-hairline">
                    <td className="py-2 pr-2 text-ink">{part.name}</td>
                    <td className="py-2 text-right tabular-nums text-ink">{part.qty}</td>
                    <td className="py-2 text-right tabular-nums text-ink">{formatDollars(part.unitPrice)}</td>
                    <td className="py-2 text-right tabular-nums text-ink">{formatDollars(part.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card title="Time on site" aside={`Billed ${formatHours(visit.billedHours)}h`}>
      <TimeEntryRows
        rows={rows}
        zone={zone}
        idPrefix="ops-entry"
        noteLabel="Contractor's visit note"
        errors={errors}
        onChange={(next) => {
          setRows(next);
          setErrors({});
        }}
      />
      {formError ? <p className="mb-2 text-xs text-brand-destructive">{formError}</p> : null}
      <div className="mt-3.5 flex flex-col gap-2 border-t border-hairline pt-3.5 md:flex-row md:items-center md:justify-end md:gap-3">
        {pending && !saving ? <span className="text-xs font-semibold text-brand-warning">Not saved yet</span> : null}
        <button
          type="button"
          disabled={!pending || saving}
          onClick={() => {
            setRows(rowsFromEntries(visit.timeEntries, zone));
            setErrors({});
            setFormError(undefined);
          }}
          className="min-h-[52px] w-full rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-50 md:min-h-11 md:w-auto md:px-[18px]"
        >
          Cancel
        </button>
        {pending || saving ? (
          <PrimaryButton
            type="button"
            onClick={() => void save()}
            loading={saving}
            loadingLabel="Saving..."
            className="md:mt-0 md:inline-block md:min-h-11 md:w-auto md:px-[18px] md:py-2.5"
          >
            Save
          </PrimaryButton>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-[52px] w-full rounded-md border border-hairline bg-ground px-4 text-sm font-bold text-muted-text md:min-h-11 md:w-auto md:px-[18px]"
          >
            Save
          </button>
        )}
      </div>
    </Card>
  );
}

function CustomerCard({ job }: { job: JobDetail }) {
  const { customer } = job;
  return (
    <Card title="Customer" aside={customer.code}>
      <div className="grid gap-3">
        <Fact label="Name">{customer.name}</Fact>
        <Fact label="Phone">
          {customer.phone ? (
            <a
              href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center font-heading text-lg font-extrabold text-ink tabular-nums"
            >
              {customer.phone}
            </a>
          ) : (
            <span className="font-normal text-muted-text">None given</span>
          )}
        </Fact>
        <Fact label="Email">
          <span className="break-all">{customer.email}</span>
        </Fact>
      </div>
    </Card>
  );
}

/** Same place: the same Places pick and the same street (the backend's own rule, plan decision 6). */
function sameAddress(a: PickedAddress | null, b: PickedAddress | null): boolean {
  if (a === null || b === null) return a === b;
  return a.placeId === b.placeId && a.street === b.street;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactForm {
  name: string;
  phone: string;
  email: string;
}
type ContactField = keyof ContactForm;
type ContactErrors = Partial<Record<ContactField, string>>;

/** Patterns / Validation timing: the group is all-or-nothing -- name and phone together, email checked when given. */
function contactErrorsOf(form: ContactForm): ContactErrors {
  const name = form.name.trim();
  const phone = form.phone.trim();
  const email = form.email.trim();
  const errors: ContactErrors = {};
  if ((name !== "" || phone !== "" || email !== "") && name === "") errors.name = "Required.";
  if ((name !== "" || phone !== "" || email !== "") && phone === "") errors.phone = "Required.";
  if (email !== "" && !EMAIL_PATTERN.test(email)) errors.email = "That does not look like an email address.";
  return errors;
}

function formOf(contact: JobDetail["siteContact"]): ContactForm {
  return { name: contact?.name ?? "", phone: contact?.phone ?? "", email: contact?.email ?? "" };
}

function AddressesCard({
  job,
  onSaved,
}: {
  job: JobDetail;
  onSaved: (next: JobDetail, message: string) => void;
}) {
  const [billing, setBilling] = useState<PickedAddress | null>(job.customer.billingAddress);
  const [billingChanged, setBillingChanged] = useState(false);
  // Feature 1017: the customer's own, fixable on any job like the billing address.
  const [businessName, setBusinessName] = useState(job.customer.businessName ?? "");
  const [billingError, setBillingError] = useState<string | undefined>();
  const [sameAsBilling, setSameAsBilling] = useState(job.siteSameAsBilling);
  const [site, setSite] = useState<PickedAddress | null>(job.siteSameAsBilling ? null : job.siteAddress);
  const [siteError, setSiteError] = useState<string | undefined>();
  const [billingPicking, setBillingPicking] = useState(false);
  const [sitePicking, setSitePicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [contact, setContact] = useState<ContactForm>(formOf(job.siteContact));
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});

  const picking = billingPicking || sitePicking;
  const effectiveSite = sameAsBilling ? billing : site;
  // V9: any site pick on a new job moves it; the line shows whenever that
  // changes the suburb or the postcode the job reads.
  const moves =
    !job.siteLocked &&
    effectiveSite !== null &&
    (effectiveSite.postcode !== job.postcode || effectiveSite.suburb !== job.suburb);
  // Save is live only when pressing it would change something: a billing
  // address re-picked, or a job site (as shown) that differs from the one
  // stored. Owner at the feel-pass, change.md V6.
  const billingWouldChange = billingChanged && billing !== null && !sameAddress(billing, job.customer.billingAddress);
  const siteWouldChange = !job.siteLocked && !sameAddress(effectiveSite, job.siteAddress);
  // Feature 4008: the site contact rides the same Save; a closed job's is read-only.
  const stored = formOf(job.siteContact);
  const contactWouldChange =
    !job.closed &&
    (contact.name.trim() !== stored.name ||
      contact.phone.trim() !== stored.phone ||
      contact.email.trim() !== stored.email);
  const businessNameWouldChange = businessName.trim() !== (job.customer.businessName ?? "");
  const pending = billingWouldChange || siteWouldChange || contactWouldChange || businessNameWouldChange;
  // The group shows no stars while it is empty; the moment any field holds a
  // value the star appears on each field the group needs (Validation timing).
  const contactStarted = contact.name.trim() !== "" || contact.phone.trim() !== "" || contact.email.trim() !== "";

  function changeContact(field: ContactField, value: string) {
    const next = { ...contact, [field]: value };
    setContact(next);
    // A shown error re-checks as the value changes; nothing new appears until blur or Save.
    setContactErrors((previous) => {
      const fresh = contactErrorsOf(next);
      const updated: ContactErrors = {};
      for (const key of ["name", "phone", "email"] as const) {
        if (previous[key] !== undefined && fresh[key] !== undefined) updated[key] = fresh[key];
      }
      return updated;
    });
  }

  function blurContact(field: ContactField) {
    const fresh = contactErrorsOf(contact);
    setContactErrors((previous) => ({ ...previous, [field]: fresh[field] }));
  }

  async function save() {
    if (billingError || siteError) {
      setFormError("Pick the marked address from the list, then save.");
      return;
    }
    const contactProblems = job.closed ? {} : contactErrorsOf(contact);
    if (Object.keys(contactProblems).length > 0) {
      setContactErrors(contactProblems);
      return;
    }
    setFormError(undefined);
    const body: Record<string, unknown> = {};
    if (!job.closed) body["siteContact"] = contact;
    // An untouched or cleared billing field leaves the one on file as it is.
    if (billingChanged && billing) body["billingAddress"] = billing;
    // Empty clears it; the server trims.
    if (businessNameWouldChange) body["businessName"] = businessName.trim();
    // Once dispatched the site is frozen -- it is never sent (Ops job actions - Edit).
    if (!job.siteLocked) {
      body["site"] = sameAsBilling ? { sameAsBilling: true } : { sameAsBilling: false, address: site };
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/addresses`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { job: JobDetail; moved: { from: string; to: string } | null } & ApiError;
      if (!res.ok) {
        if (payload.field === "billingAddress") setBillingError(payload.error);
        else if (payload.field === "siteAddress") setSiteError(payload.error);
        else if (payload.field === "siteContactName") setContactErrors({ name: payload.error });
        else if (payload.field === "siteContactPhone") setContactErrors({ phone: payload.error });
        else if (payload.field === "siteContactEmail") setContactErrors({ email: payload.error });
        else setFormError(payload.error);
        return;
      }
      onSaved(
        payload.job,
        payload.moved
          ? `Saved ${job.reference}. The job moved to ${payload.moved.to}.`
          : `Saved ${job.reference}.`,
      );
    } catch {
      setFormError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Addresses and site contact">
      <PlacesField
        id="billing-address"
        label="Billing address"
        helper="Shown on invoice"
        value={billing}
        onChange={(value) => {
          setBilling(value);
          setBillingChanged(true);
        }}
        error={billingError}
        onErrorChange={setBillingError}
        onPickingChange={setBillingPicking}
      />
      <Field
        id="business-name"
        label="Business name"
        value={businessName}
        onChange={(event) => setBusinessName(event.target.value)}
        autoComplete="off"
      />

      {job.siteLocked ? (
        <LockedField
          label="Job site address"
          // No site stored means the job is at the billing address (the tick
          // box's default, plan decision 6) -- shown as that address, locked.
          // Owner at the feel-pass, change.md V3.
          value={
            job.siteAddress
              ? fullAddress(job.siteAddress)
              : job.customer.billingAddress
                ? fullAddress(job.customer.billingAddress)
                : "None taken"
          }
          helper={
            job.contractor
              ? `Locked - this job is already with ${job.contractor.name.split(" ")[0] ?? job.contractor.name}.`
              : "Locked - this job is no longer new."
          }
        />
      ) : (
        <>
          <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              className="size-5 accent-brand-accent"
              checked={sameAsBilling}
              onChange={(event) => {
                setSameAsBilling(event.target.checked);
                setSiteError(undefined);
              }}
            />
            <span>
              <span className="font-bold">Job site address</span> same as billing address
            </span>
          </label>
          {/* Ticked, the site IS the billing address -- shown as that address,
              greyed and locked (owner at the feel-pass, change.md V4). */}
          {sameAsBilling ? (
            billing === null ? null : (
              <LockedField label="Job site address" value={fullAddress(billing)} />
            )
          ) : (
            <PlacesField
              id="site-address"
              label="Job site address"
              value={site}
              onChange={setSite}
              error={siteError}
              onErrorChange={setSiteError}
              onPickingChange={setSitePicking}
            />
          )}
          {moves && effectiveSite ? (
            <p className="mb-3.5 text-xs text-brand-warning">
              Saving addresses moves the job from {job.suburb} {job.postcode} to {effectiveSite.suburb}{" "}
              {effectiveSite.postcode}.
            </p>
          ) : null}
        </>
      )}

      <div data-testid="site-contact" className="mt-1 mb-3.5">
        <span className={labelClass}>Site contact</span>
        {job.closed ? (
          <div className="mt-[5px]">
            {job.siteContact ? (
              <dl className="grid gap-1 text-sm text-ink">
                <div>
                  <dt className="sr-only">Name</dt>
                  <dd className="font-semibold">{job.siteContact.name}</dd>
                </div>
                <div>
                  <dt className="sr-only">Phone</dt>
                  <dd className="tabular-nums">{job.siteContact.phone}</dd>
                </div>
                {job.siteContact.email ? (
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd className="break-all">{job.siteContact.email}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-muted-text">None</p>
            )}
          </div>
        ) : (
          <>
            <p className="mt-[5px] mb-2.5 text-xs text-muted-text">
              Enter if someone other than the customer will be on site
            </p>
            <Field
              id="site-contact-name"
              label="Name"
              required={contactStarted}
              value={contact.name}
              onChange={(event) => changeContact("name", event.target.value)}
              onBlur={() => blurContact("name")}
              error={contactErrors.name}
              autoComplete="off"
            />
            <Field
              id="site-contact-phone"
              label="Phone"
              type="tel"
              required={contactStarted}
              value={contact.phone}
              onChange={(event) => changeContact("phone", event.target.value)}
              onBlur={() => blurContact("phone")}
              error={contactErrors.phone}
              autoComplete="off"
            />
            <Field
              id="site-contact-email"
              label="Email"
              inputMode="email"
              value={contact.email}
              onChange={(event) => changeContact("email", event.target.value)}
              onBlur={() => blurContact("email")}
              error={contactErrors.email}
              autoComplete="off"
            />
          </>
        )}
      </div>

      {formError ? <p className="mb-2 text-xs text-brand-destructive">{formError}</p> : null}
      <div
        className={`flex-col gap-2 border-t border-hairline pt-3.5 md:flex-row md:items-center md:justify-end md:gap-3 ${
          job.closed && !pending && !saving ? "hidden" : "flex"
        }`}
      >
        {pending && !saving ? <span className="text-xs font-semibold text-brand-warning">Not saved yet</span> : null}
        {pending || saving ? (
          <PrimaryButton
            type="button"
            onClick={() => void save()}
            loading={saving}
            loadingLabel="Saving..."
            disabled={picking}
            className="md:mt-0 md:inline-block md:min-h-11 md:w-auto md:px-[18px] md:py-2.5"
          >
            {picking ? "Picking address..." : "Save"}
          </PrimaryButton>
        ) : job.closed ? null : (
          <button
            type="button"
            disabled
            className="min-h-[52px] w-full rounded-md border border-hairline bg-ground px-4 text-sm font-bold text-muted-text md:min-h-11 md:w-auto md:px-[18px]"
          >
            {picking ? "Picking address..." : "Save"}
          </button>
        )}
      </div>
    </Card>
  );
}

const MESSAGE_TAGS: Record<MessageView["status"], string> = {
  queued: "bg-message-waiting-bg text-message-waiting",
  sent: "bg-message-sent-bg text-message-sent",
  delivered: "bg-message-delivered-bg text-message-delivered",
  failed: "bg-error-bg text-brand-destructive",
};

function MessageTag({ message }: { message: MessageView }) {
  return (
    <span
      data-message-status={message.status}
      className={`inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase ${MESSAGE_TAGS[message.status]}`}
    >
      {message.statusLabel}
    </span>
  );
}

const INVOICE_TAGS: Record<InvoiceView["status"] | "waiting", { label: string; pair: string }> = {
  sent: { label: "Sent", pair: "bg-status-cancelled-bg text-status-cancelled" },
  paid: { label: "Paid", pair: "bg-success-bg text-brand-success" },
  void: { label: "Void", pair: "bg-status-cancelled-bg text-status-cancelled" },
  waiting: { label: "Waiting for pay link", pair: "bg-warning-bg text-brand-warning" },
};

/** "Rossi's Cafe / Attn: Nina Rossi", or the name alone. */
function BilledTo({ billedTo }: { billedTo: InvoiceView["billedTo"] }) {
  if (billedTo.businessName === null) return <>{billedTo.name}</>;
  return (
    <>
      {billedTo.businessName}
      <span className="block text-[13px] font-normal text-secondary-text">Attn: {billedTo.name}</span>
    </>
  );
}

/**
 * Feature 6001: the Invoice card, straight after Time on site. Reads the invoice's
 * frozen rows only (lines, billed-to, the GST stamp). Resend invoice and Copy pay
 * link are the backups for a message that did not land. Feature 6002: Check payment
 * with Stripe is the backup for Stripe's own message not arriving; once paid the card
 * shows when and how, and the backups go.
 */
function InvoiceCard({
  job,
  invoice,
  onSent,
  onToast,
  onErrorToast,
}: {
  job: JobDetail;
  invoice: InvoiceView;
  onSent: (next: JobDetail, message: string) => void;
  onToast: (message: string) => void;
  onErrorToast: (message: string) => void;
}) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const tag = INVOICE_TAGS[invoice.waitingForPayLink ? "waiting" : invoice.status];
  const th = `${labelClass} pb-1.5 font-bold`;

  async function resend() {
    setError(undefined);
    setResending(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/invoice/resend`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await res.json()) as JobDetail & ApiError;
      if (!res.ok) {
        setError(payload.error);
        return;
      }
      onSent(payload, "Invoice sent again.");
    } catch {
      setError("Couldn't send the invoice - check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  async function checkPayment() {
    setChecking(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/invoice/check-payment`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as Partial<ApiError>;
        onErrorToast(res.status === 502 ? "Couldn't reach Stripe - try again in a minute." : (payload.error ?? "Couldn't check the payment - try again."));
        return;
      }
      const payload = (await res.json()) as { paid: boolean; job: JobDetail };
      if (payload.paid) onSent(payload.job, `Paid - ${invoice.reference} is marked paid.`);
      else onToast("No payment yet.");
    } catch {
      onErrorToast("Couldn't reach Stripe - try again in a minute.");
    } finally {
      setChecking(false);
    }
  }

  async function copyLink() {
    if (invoice.payLinkUrl === null) return;
    try {
      await navigator.clipboard.writeText(invoice.payLinkUrl);
      onToast("Pay link copied.");
    } catch {
      onToast("Couldn't copy - the link is in the invoice email.");
    }
  }

  return (
    <Card title="Invoice" aside={invoice.reference}>
      <div className="mb-3.5">
        <span
          data-testid="invoice-status"
          className={`inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase ${tag.pair}`}
        >
          {tag.label}
        </span>
        {invoice.waitingForPayLink ? (
          <p className="mt-1.5 text-[13px] text-muted-text">
            Stripe has not answered yet. The invoice goes out by email and text as soon as it does.
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mb-3.5 rounded-md border border-error-border bg-error-bg px-3 py-2.5 text-[13px] text-brand-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-x-4.5 gap-y-3.5 sm:grid-cols-4">
        <Fact label="Billed to">
          <BilledTo billedTo={invoice.billedTo} />
        </Fact>
        <Fact label="Issued">{invoice.issuedLabel}</Fact>
        <Fact label="Due">{invoice.dueLabel}</Fact>
        <Fact label="Total">{formatDollars(invoice.amount)}</Fact>
        {invoice.paidLabel ? <Fact label="Paid">{invoice.paidLabel}</Fact> : null}
      </div>
      <table className="mt-3.5 w-full text-sm" data-testid="invoice-lines">
        <thead>
          <tr className="text-left">
            <th className={th}>Item</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Price</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index} className="border-t border-hairline">
              <td className="py-2 pr-2 text-ink">{line.description}</td>
              <td className="py-2 text-right tabular-nums text-ink">{line.qty}</td>
              <td className="py-2 text-right tabular-nums text-ink">{formatDollars(line.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums text-ink">{formatDollars(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {invoice.gstApplied ? (
            <>
              <tr className="border-t-2 border-ink">
                <td colSpan={3} className="pt-2 pr-2 text-right text-secondary-text">Subtotal</td>
                <td className="pt-2 text-right tabular-nums text-ink">{formatDollars(invoice.amount - invoice.gstAmount)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="pr-2 text-right text-secondary-text">Includes GST</td>
                <td className="text-right tabular-nums text-ink">{formatDollars(invoice.gstAmount)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="pt-1 pr-2 text-right font-bold text-ink">Total</td>
                <td className="pt-1 text-right font-bold tabular-nums text-ink">{formatDollars(invoice.amount)}</td>
              </tr>
            </>
          ) : (
            <tr className="border-t-2 border-ink">
              <td colSpan={3} className="pt-2 pr-2 text-right font-bold text-ink">Total</td>
              <td className="pt-2 text-right font-bold tabular-nums text-ink">{formatDollars(invoice.amount)}</td>
            </tr>
          )}
        </tfoot>
      </table>
      {invoice.canResend || invoice.canCheckPayment ? (
        <div className="mt-3.5 flex flex-wrap gap-x-4 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={resending}
            className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2 disabled:opacity-60"
          >
            {resending ? "Sending..." : "Resend invoice"}
          </button>
          <button type="button" onClick={() => void copyLink()} className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2">
            Copy pay link
          </button>
          {invoice.canCheckPayment ? (
            <button
              type="button"
              onClick={() => void checkPayment()}
              disabled={checking}
              className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2 disabled:opacity-60"
            >
              {checking ? "Checking..." : "Check payment with Stripe"}
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/** Feature 4008: every message sent about the job, newest first -- a table from 768px, cards below (Patterns / Table to cards). */
function MessagesCard({ job }: { job: JobDetail }) {
  const th = "border-b border-hairline px-2 py-2.5 text-left align-bottom text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
  const td = "border-b border-hairline px-2 py-3 align-top text-secondary-text";
  return (
    <Card title="Messages">
      {job.messages.length === 0 ? (
        <p className="text-[13px] text-muted-text">No messages yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>To</th>
                  <th className={th}>Via</th>
                  <th className={th}>When</th>
                  <th className={th}>What</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {job.messages.map((message) => (
                  <tr key={message.id} data-testid="message-row" className="last:[&>td]:border-b-0">
                    <td className={`${td} font-semibold text-ink`}>{message.to}</td>
                    <td className={td}>{message.channel}</td>
                    <td className={`${td} tabular-nums`}>{message.whenLabel}</td>
                    <td className={td}>{message.what}</td>
                    <td className={td}>
                      <MessageTag message={message} />
                      {message.error ? <span className="mt-1 block text-xs text-brand-destructive">{message.error}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col md:hidden">
            {job.messages.map((message) => (
              <li key={message.id} data-testid="message-card" className="border-t border-hairline py-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{message.what}</span>
                  <MessageTag message={message} />
                </div>
                <p className="mt-1 text-sm text-secondary-text">To {message.to}</p>
                <p className="text-xs text-muted-text tabular-nums">
                  {message.channel} - {message.whenLabel}
                </p>
                {message.error ? <p className="mt-1 text-xs text-brand-destructive">{message.error}</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "instruction", label: "Instruction" },
  { value: "complaint", label: "Complaint" },
  { value: "dispute", label: "Dispute" },
] as const;

const NOTE_TYPE_LABELS: Record<string, string> = {
  general: "General",
  instruction: "Instruction",
  complaint: "Complaint",
  dispute: "Dispute",
  correction: "Correction",
};

function NoteTypeTag({ type }: { type: string }) {
  const warn = type === "dispute" || type === "complaint";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase ${
        warn ? "bg-warning-bg text-brand-warning" : "bg-secondary text-secondary-text"
      }`}
    >
      {NOTE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

const textareaClass =
  "min-h-[72px] w-full resize-y rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";

function NotesCard({
  job,
  onChanged,
}: {
  job: JobDetail;
  onChanged: (next: JobDetail, message: string) => void;
}) {
  const [type, setType] = useState<string>("general");
  const [text, setText] = useState("");
  const [textError, setTextError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState<string | undefined>();
  const [savingEdit, setSavingEdit] = useState(false);
  // The author's window closes on its own while the page stays open: each
  // editable note counts down from the seconds the server gave it.
  const [expired, setExpired] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const timers = job.notes
      .filter((note) => note.id !== null && note.editableForSeconds > 0)
      .map((note) =>
        window.setTimeout(() => {
          setExpired((previous) => new Set(previous).add(note.id ?? ""));
        }, note.editableForSeconds * 1000),
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [job.notes]);

  function canEdit(note: NoteView): boolean {
    return note.id !== null && note.editableForSeconds > 0 && !expired.has(note.id);
  }

  async function add() {
    if (text.trim() === "") {
      setTextError("Required.");
      return;
    }
    setTextError(undefined);
    setAdding(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: text }),
      });
      const payload = (await res.json()) as JobDetail & ApiError;
      if (!res.ok) {
        setTextError(payload.error);
        return;
      }
      setText("");
      setType("general");
      onChanged(payload, `Note added to ${job.reference}.`);
    } catch {
      setTextError("The note did not save - check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(noteId: string) {
    if (editText.trim() === "") {
      setEditError("Required.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`${apiUrl}/api/jobs/${encodeURIComponent(job.reference)}/notes/${noteId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editText }),
      });
      const payload = (await res.json()) as JobDetail & ApiError;
      if (!res.ok) {
        setEditError(payload.error);
        if (res.status === 409 || res.status === 403) setExpired((previous) => new Set(previous).add(noteId));
        return;
      }
      setEditingId(null);
      onChanged(payload, "Note updated. It locks 10 minutes after it was written.");
    } catch {
      setEditError("The change did not save - check your connection and try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <Card title="Operator notes" subtitle="Editable only for 10min and then locked">
      <div className="flex flex-col">
        <SelectField
          id="note-type"
          label="Type"
          options={NOTE_TYPES}
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="max-w-[240px]"
        />
        <label htmlFor="note-text" className={`mb-[5px] ${labelClass}`}>
          Note
        </label>
        <textarea
          id="note-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What was said or decided, in a line or two"
          aria-invalid={textError ? true : undefined}
          className={`${textareaClass} ${textError ? "border-brand-destructive" : "border-hairline"}`}
        />
        {textError ? <p className="mt-[5px] text-xs text-brand-destructive">{textError}</p> : null}
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={() => void add()}
            disabled={adding}
            className="min-h-11 rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60"
          >
            {adding ? "Adding..." : "Add note"}
          </button>
        </div>
      </div>

      {job.notes.length === 0 ? (
        <p className="mt-3.5 border-t border-hairline pt-3 text-[13px] text-muted-text">No notes yet.</p>
      ) : (
        <ul className="mt-3.5">
          {job.notes.map((note, index) => (
            <li key={note.id ?? `legacy-${String(index)}`} data-note-id={note.id ?? undefined} className="border-t border-hairline py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-text">
                <NoteTypeTag type={note.type} />
                <span className="tabular-nums">{note.atLabel}</span>
                <span>{note.authorName}</span>
                {note.edited ? <span>(edited)</span> : null}
                {canEdit(note) && editingId !== note.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditText(note.note);
                      setEditError(undefined);
                    }}
                    className="min-h-11 min-w-11 px-2 text-xs font-semibold text-ink underline underline-offset-2"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {editingId !== null && editingId === note.id ? (
                <div className="mt-1.5">
                  <textarea
                    aria-label="Edit note"
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    className={`${textareaClass} ${editError ? "border-brand-destructive" : "border-hairline"}`}
                  />
                  {editError ? <p className="mt-[5px] text-xs text-brand-destructive">{editError}</p> : null}
                  <div className="mt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-11 px-2 text-sm font-semibold text-ink underline underline-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(note.id ?? "")}
                      disabled={savingEdit}
                      className="min-h-11 rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60"
                    >
                      {savingEdit ? "Saving..." : "Save note"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 max-w-[62ch] text-sm whitespace-pre-wrap text-ink">{note.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function JobDetailView({ initial }: { initial: JobDetail }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [job, setJob] = useState(initial);
  // Each card starts over from the saved record after its own save, so a
  // note being written is never wiped by an address save, or the reverse.
  const [addressesVersion, setAddressesVersion] = useState(0);
  const [notesVersion, setNotesVersion] = useState(0);
  const [visitVersion, setVisitVersion] = useState(0);
  const [toastMessage, showToast] = useToast();
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    // Feature 4002, plan decision 15: after Dispatch the page returns here
    // with the toast riding the URL, the same pattern the Contractors list
    // uses for "Save always returns to the list with a toast."
    const toast = searchParams.get("toast");
    if (toast) {
      showToast(toast);
      router.replace(`/ops/jobs/${encodeURIComponent(job.reference)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-rows-[auto_auto_auto_auto_auto_1fr]">
        {/* Mobile stack order: Request, Customer, Addresses, Contractor/Dispatch,
            Messages, Operator notes -- Addresses before Dispatch mirrors the
            actual dependency (no address, no dispatch). Desktop's two-column
            arrangement (Request+Contractor+Messages+Notes left, Customer+Addresses
            right) rides the explicit xl: column/row placement. */}
        <div className="order-1 min-w-0 xl:order-none xl:col-start-1 xl:row-start-1">
          <RequestCard job={job} />
        </div>
        <div className="order-2 min-w-0 xl:order-none xl:col-start-2 xl:row-start-1">
          <CustomerCard job={job} />
        </div>
        <div className="order-3 min-w-0 xl:order-none xl:col-start-2 xl:row-span-5 xl:row-start-2">
          <AddressesCard
            key={`addresses-${String(addressesVersion)}`}
            job={job}
            onSaved={(next, message) => {
              setJob(next);
              setAddressesVersion((v) => v + 1);
              showToast(message);
              // The page title line names the suburb, which a street pick can move.
              router.refresh();
            }}
          />
        </div>
        <div className="order-4 min-w-0 xl:order-none xl:col-start-1 xl:row-start-2">
          <ContractorCard job={job} />
        </div>
        {job.visit ? (
          <div className="order-5 min-w-0 xl:order-none xl:col-start-1 xl:row-start-3">
            <TimeOnSiteCard
              key={`visit-${String(visitVersion)}`}
              job={job}
              visit={job.visit}
              onSaved={(next, message) => {
                setJob(next);
                setVisitVersion((v) => v + 1);
                showToast(message);
              }}
            />
          </div>
        ) : null}
        {job.invoice ? (
          <div className="order-6 min-w-0 xl:order-none xl:col-start-1 xl:row-start-4">
            <InvoiceCard
              job={job}
              invoice={job.invoice}
              onToast={showToast}
              onErrorToast={setErrorToast}
              onSent={(next, message) => {
                setJob(next);
                showToast(message);
              }}
            />
          </div>
        ) : null}
        <div className="order-7 min-w-0 xl:order-none xl:col-start-1 xl:row-start-5">
          <MessagesCard job={job} />
        </div>
        <div className="order-8 min-w-0 xl:order-none xl:col-start-1 xl:row-start-6">
          <NotesCard
            key={`notes-${String(notesVersion)}`}
            job={job}
            onChanged={(next, message) => {
              setJob(next);
              setNotesVersion((v) => v + 1);
              showToast(message);
            }}
          />
        </div>
      </div>
      <Toast message={toastMessage} />
      <ErrorToast message={errorToast} onClose={() => setErrorToast(null)} />
    </>
  );
}
