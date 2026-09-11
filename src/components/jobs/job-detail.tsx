// The job page's cards -- Feature 4001, ops job queue and job detail.
//
// Operations Admin Workflow / The job queue and the job page: "The job page
// is where the confirming call is captured." Left, what the customer asked
// for (read-only) and who is on it; right, who they are, the Addresses card
// (billing + the tick box + site, ONE Save -- Portal form screens) and the
// operator notes log (a stacked add form at every width, newest first, the
// author's Edit for 10 minutes, "(edited)").
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PlacesField, fullAddress, type PickedAddress } from "@/components/ui/places-field";
import { LockedField } from "@/components/ui/locked-field";
import { SelectField } from "@/components/ui/select-field";
import { PrimaryButton } from "@/components/auth/buttons";
import { Toast, useToast } from "@/components/ui/toast";
import type { ApiError, JobDetail, NoteView } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";

function Card({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
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
    <Card title="The request" aside="as the customer sent it">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4.5 gap-y-3">
        <Fact label="Trade">{job.trade}</Fact>
        <Fact label="Suburb">
          {job.suburb} {job.postcode}
        </Fact>
        <Fact label="Wanted">
          <span className="tabular-nums">
            {job.wantedDate}, {job.windowLabel}
          </span>
        </Fact>
        <Fact label="Arrived by">{job.source === "web" ? "Web form" : "Phone"}</Fact>
        <Fact label="What is happening" wide>
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
      </div>
    </Card>
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
          <Fact label="Where it stands">
            <span className="tabular-nums">{job.contractor.standing}</span>
          </Fact>
        </div>
      ) : (
        <p className="text-[13px] text-muted-text">Not dispatched yet.</p>
      )}
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

function AddressesCard({
  job,
  onSaved,
}: {
  job: JobDetail;
  onSaved: (next: JobDetail, message: string) => void;
}) {
  const name = job.customer.name;
  const [billing, setBilling] = useState<PickedAddress | null>(job.customer.billingAddress);
  const [billingChanged, setBillingChanged] = useState(false);
  const [billingError, setBillingError] = useState<string | undefined>();
  const [sameAsBilling, setSameAsBilling] = useState(job.siteSameAsBilling);
  const [site, setSite] = useState<PickedAddress | null>(job.siteSameAsBilling ? null : job.siteAddress);
  const [siteError, setSiteError] = useState<string | undefined>();
  const [billingPicking, setBillingPicking] = useState(false);
  const [sitePicking, setSitePicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

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
  const pending = billingWouldChange || siteWouldChange;

  async function save() {
    if (billingError || siteError) {
      setFormError("Pick the marked address from the list, then save.");
      return;
    }
    setFormError(undefined);
    const body: Record<string, unknown> = {};
    // An untouched or cleared billing field leaves the one on file as it is.
    if (billingChanged && billing) body["billingAddress"] = billing;
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
        else setFormError(payload.error);
        return;
      }
      onSaved(
        payload.job,
        payload.moved
          ? `Addresses saved for ${job.reference}. The job moved to ${payload.moved.to}.`
          : `Addresses saved for ${job.reference}.`,
      );
    } catch {
      setFormError("Save failed - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Addresses" aside="taken on the confirming call">
      <PlacesField
        id="billing-address"
        label="Billing address"
        helper={
          job.customer.billingAddress
            ? `${name}'s own address, on every invoice. Changing it here changes it for all of ${name}'s future invoices.`
            : "Their own address - ask for it on the first call. It goes on every invoice."
        }
        value={billing}
        onChange={(value) => {
          setBilling(value);
          setBillingChanged(true);
        }}
        error={billingError}
        onErrorChange={setBillingError}
        onPickingChange={setBillingPicking}
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
            billing === null ? (
              <p className="mb-3.5 text-xs text-muted-text">Fills in from the billing address once that is picked.</p>
            ) : (
              <LockedField
                label="Job site address"
                value={fullAddress(billing)}
                helper="Untick the box to use a different address."
              />
            )
          ) : (
            <PlacesField
              id="site-address"
              label="Job site address"
              helper="A rental, a parent's house, a shop - pick its street address."
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

      {formError ? <p className="mb-2 text-xs text-brand-destructive">{formError}</p> : null}
      <div className="flex flex-col gap-2 border-t border-hairline pt-3.5 md:flex-row md:items-center md:justify-end md:gap-3">
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
            {picking ? "Picking address..." : "Save addresses"}
          </PrimaryButton>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-[52px] w-full rounded-md border border-hairline bg-ground px-4 text-sm font-bold text-muted-text md:min-h-11 md:w-auto md:px-[18px]"
          >
            {picking ? "Picking address..." : "Save addresses"}
          </button>
        )}
      </div>
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
    <Card title="Operator notes" aside="a log - fixable for 10 minutes, then locked">
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
  const [job, setJob] = useState(initial);
  // Each card starts over from the saved record after its own save, so a
  // note being written is never wiped by an address save, or the reverse.
  const [addressesVersion, setAddressesVersion] = useState(0);
  const [notesVersion, setNotesVersion] = useState(0);
  const [toastMessage, showToast] = useToast();

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <RequestCard job={job} />
          <ContractorCard job={job} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CustomerCard job={job} />
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
    </>
  );
}
