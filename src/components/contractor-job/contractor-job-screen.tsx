// Bob's job screen -- Feature 5001, contractor job screen and Complete.
//
// Contractor Workflow step 8: one form with two buttons. Save keeps what he
// has entered - time entries, completion notes, parts - and he can come back
// and change it; Complete job saves it all and freezes it. A completed job
// shows every control frozen, no Add or Remove, no bottom bar.
//
// Designed Mobile first (Pages / Who each page is designed for): one column,
// the Bottom action bar fixed to the bottom of the phone.
"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Field } from "@/components/auth/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast, useToast } from "@/components/ui/toast";
import {
  FROZEN_MESSAGE,
  TimeEntryRows,
  freshKey,
  isBlankRow,
  rowsFromEntries,
  type TimeEntryRow,
} from "@/components/ui/time-entry-rows";
import { PHOTO_TOO_BIG, PHOTO_WRONG_TYPE } from "@/components/request-a-job/use-enquiry-photos";
import { billedHoursOf, formatHours } from "@/lib/billed-hours";
import { centsToDollarsText, dollarsTextToCents } from "@/lib/visit-format";
import { formatDollars } from "@/components/request-a-job/money";
import type { ApiError, ContractorJobDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_UNAVAILABLE = "Photo upload isn't working right now - try again shortly";

const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";
const starClass = "after:ml-0.5 after:text-brand-destructive after:content-['*']";

interface Receipt {
  id: string;
  fileName: string;
  thumbnailUrl: string;
  fullUrl: string;
}

interface PartRow {
  key: string;
  name: string;
  qty: string;
  price: string;
  receipt: Receipt | null;
  uploading: boolean;
}

type Errors = Record<string, string>;

function Card({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-[10px] border border-hairline bg-surface p-4 md:p-5">
      <h2 className="font-heading text-base font-extrabold text-ink">
        {title}
        {aside ? <small className="ml-1.5 font-body text-xs font-normal text-muted-text">{aside}</small> : null}
      </h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>
      <div className="mt-[5px] font-semibold text-ink">{children}</div>
    </div>
  );
}

function LockedValue({ label, value, message }: { label: string; value: string; message?: boolean }) {
  return (
    <div className="mb-3.5">
      <span className={`${labelClass} mb-[5px]`}>{label}</span>
      <div className="flex min-h-[44px] items-center gap-2 rounded-md border border-hairline bg-ground px-2.5 py-2 text-sm text-ink">
        <Lock aria-hidden className="size-3.5 shrink-0 text-muted-text" />
        <span className="whitespace-pre-wrap">{value}</span>
      </div>
      {message ? <p className="mt-[5px] text-xs text-muted-text">{FROZEN_MESSAGE}</p> : null}
    </div>
  );
}

function partRowsOf(job: ContractorJobDto): PartRow[] {
  return job.parts.map((part) => ({
    key: freshKey("part"),
    name: part.name,
    qty: String(part.qty),
    price: centsToDollarsText(part.unitPrice),
    receipt:
      part.receiptAttachmentId === null
        ? null
        : {
            id: part.receiptAttachmentId,
            fileName: part.receipt?.fileName ?? "receipt",
            thumbnailUrl: part.receipt?.thumbnailUrl ?? "",
            fullUrl: part.receipt?.fullUrl ?? "",
          },
    uploading: false,
  }));
}

function isBlankPart(part: PartRow): boolean {
  return part.name.trim() === "" && part.price.trim() === "" && part.receipt === null && !part.uploading;
}

function newPart(): PartRow {
  return { key: freshKey("part"), name: "", qty: "1", price: "", receipt: null, uploading: false };
}

/** What would be saved, as one string -- Save stays Quiet until it differs from what is stored. */
function snapshotOf(rows: TimeEntryRow[], notes: string, parts: PartRow[]): string {
  return JSON.stringify({
    entries: rows.filter((row) => !isBlankRow(row)).map((row) => [row.date, row.start, row.end, row.note.trim()]),
    notes: notes.trim(),
    parts: parts.filter((part) => !isBlankPart(part)).map((part) => [part.name.trim(), part.qty.trim(), part.price.trim(), part.receipt?.id ?? null]),
  });
}

async function uploadReceipt(
  reference: string,
  file: File,
): Promise<{ ok: true; receipt: Receipt } | { ok: false; message: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!file.type.startsWith("image/") && !(file.type === "" && ["jpg", "jpeg", "png", "webp", "heic"].includes(extension))) {
    return { ok: false, message: PHOTO_WRONG_TYPE };
  }
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, message: PHOTO_TOO_BIG };
  try {
    const base = `${apiUrl}/api/contractor/jobs/${encodeURIComponent(reference)}`;
    const signed = await fetch(`${base}/receipt-signature`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!signed.ok) return { ok: false, message: RECEIPT_UNAVAILABLE };
    const signature = (await signed.json()) as {
      cloudName: string;
      apiKey: string;
      timestamp: number;
      signature: string;
      uploadPreset: string;
      folder: string;
      allowedFormats: string;
    };
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("upload_preset", signature.uploadPreset);
    form.append("folder", signature.folder);
    form.append("allowed_formats", signature.allowedFormats);
    form.append("return_delete_token", "true");
    const up = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body: form });
    const uploaded = (await up.json().catch(() => ({}))) as { public_id?: string };
    if (!up.ok || !uploaded.public_id) return { ok: false, message: "Didn't upload - try again" };
    const confirmed = await fetch(`${base}/receipts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey: uploaded.public_id, fileName: file.name }),
    });
    if (!confirmed.ok) return { ok: false, message: "Didn't upload - try again" };
    const body = (await confirmed.json()) as Receipt;
    return { ok: true, receipt: body };
  } catch {
    return { ok: false, message: "Didn't upload - try again" };
  }
}

export function ContractorJobScreen({ initial }: { initial: ContractorJobDto }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [rows, setRows] = useState<TimeEntryRow[]>(() => rowsFromEntries(initial.timeEntries, initial.timezone));
  const [notes, setNotes] = useState(initial.completionNotes);
  const [parts, setParts] = useState<PartRow[]>(() => partRowsOf(initial));
  const [saved, setSaved] = useState(() =>
    snapshotOf(rowsFromEntries(initial.timeEntries, initial.timezone), initial.completionNotes, partRowsOf(initial)),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | undefined>();
  const [receiptMessages, setReceiptMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"save" | "complete" | "onsite" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toastMessage, showToast] = useToast();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const frozen = job.frozen;
  const changed = snapshotOf(rows, notes, parts) !== saved;
  const uploading = parts.some((part) => part.uploading);
  const billed = billedHoursOf(rows, job.returnVisitMinimumMinutes);
  const capLabel = formatDollars(job.maxContractorPartAmount);

  /** Everything the server gets, and where each sent row sat on screen (blank rows are not sent). */
  function buildRequest(): { body: Record<string, unknown>; entryAt: number[]; partAt: number[] } {
    const entryAt: number[] = [];
    const partAt: number[] = [];
    const timeEntries = rows.flatMap((row, index) => {
      if (isBlankRow(row)) return [];
      entryAt.push(index);
      return [{ date: row.date, start: row.start, end: row.end, note: row.note }];
    });
    const sentParts = parts.flatMap((part, index) => {
      if (isBlankPart(part)) return [];
      partAt.push(index);
      return [
        {
          name: part.name,
          description: "",
          qty: Number(part.qty),
          unitPrice: dollarsTextToCents(part.price) ?? 0,
          receiptAttachmentId: part.receipt?.id ?? "",
        },
      ];
    });
    return { body: { timeEntries, completionNotes: notes, parts: sentParts }, entryAt, partAt };
  }

  /** The rules a person can see before the server is asked -- the same words the server uses. */
  function check(forComplete: boolean): Errors {
    const found: Errors = {};
    const filled = rows.filter((row) => !isBlankRow(row));
    rows.forEach((row, index) => {
      if (isBlankRow(row)) return;
      if (row.date === "") found[`${String(index)}.date`] = "Required.";
      if (row.start === "") found[`${String(index)}.start`] = "Required.";
      if (row.end === "") found[`${String(index)}.end`] = "Required.";
      else if (row.start !== "" && row.end <= row.start) found[`${String(index)}.end`] = "Finish must be after start.";
    });
    parts.forEach((part, index) => {
      if (isBlankPart(part)) return;
      if (part.name.trim() === "") found[`part.${String(index)}.name`] = "Required.";
      const qty = Number(part.qty);
      if (part.qty.trim() === "" || !Number.isFinite(qty)) found[`part.${String(index)}.qty`] = "Required.";
      else if (qty <= 0) found[`part.${String(index)}.qty`] = "Must be more than zero.";
      if (dollarsTextToCents(part.price) === null) found[`part.${String(index)}.price`] = "Required.";
      if (part.receipt === null && !part.uploading) found[`part.${String(index)}.receipt`] = "Required.";
    });
    if (forComplete) {
      if (filled.length === 0) found["rows"] = "Add at least one visit.";
      if (notes.trim() === "") found["notes"] = "Required.";
    }
    return found;
  }

  function adopt(next: ContractorJobDto) {
    setJob(next);
    const nextRows = rowsFromEntries(next.timeEntries, next.timezone);
    const nextParts = partRowsOf(next);
    setRows(nextRows);
    setNotes(next.completionNotes);
    setParts(nextParts);
    setSaved(snapshotOf(nextRows, next.completionNotes, nextParts));
  }

  /** The server's refusal, put on the field it names. */
  function place(error: ApiError, entryAt: number[], partAt: number[]) {
    const field = error.field ?? "";
    const entry = /^timeEntries\[(\d+)\]\.(\w+)$/.exec(field);
    const part = /^parts\[(\d+)\]\.(\w+)$/.exec(field);
    if (entry) setErrors({ [`${String(entryAt[Number(entry[1])] ?? 0)}.${entry[2] ?? ""}`]: error.error });
    else if (part) setErrors({ [`part.${String(partAt[Number(part[1])] ?? 0)}.${part[2] === "unitPrice" ? "price" : (part[2] ?? "")}`]: error.error });
    else if (field === "timeEntries") setErrors({ rows: error.error });
    else if (field === "completionNotes") setErrors({ notes: error.error });
    else setBanner(error.error);
  }

  async function send(complete: boolean) {
    setBanner(undefined);
    const problems = check(complete);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setConfirming(false);
      return;
    }
    const { body, entryAt, partAt } = buildRequest();
    setBusy(complete ? "complete" : "save");
    try {
      const res = await fetch(
        `${apiUrl}/api/contractor/jobs/${encodeURIComponent(job.reference)}${complete ? "/complete" : ""}`,
        {
          method: complete ? "POST" : "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await res.json()) as ContractorJobDto & ApiError;
      if (!res.ok) {
        setConfirming(false);
        place(payload, entryAt, partAt);
        return;
      }
      adopt(payload);
      setConfirming(false);
      showToast(complete ? `Completed ${job.reference}.` : `Saved ${job.reference}.`);
      if (complete) router.refresh();
    } catch {
      setConfirming(false);
      setBanner("Save failed - check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onSite() {
    setBanner(undefined);
    setBusy("onsite");
    try {
      const res = await fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(job.reference)}/on-site`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setBanner("Couldn't mark you on site - try again.");
        return;
      }
      const next = (await res.json()) as ContractorJobDto;
      // Only the status moved: what he is typing stays as it is.
      setJob((current) => ({ ...current, jobStatus: next.jobStatus, assignmentStatus: next.assignmentStatus, canOnSite: next.canOnSite }));
      router.refresh();
    } catch {
      setBanner("Couldn't mark you on site - try again.");
    } finally {
      setBusy(null);
    }
  }

  function updatePart(index: number, changes: Partial<PartRow>) {
    setParts((current) => current.map((part, i) => (i === index ? { ...part, ...changes } : part)));
  }

  async function chooseReceipt(index: number, key: string, file: File) {
    setReceiptMessages((current) => ({ ...current, [key]: "" }));
    updatePart(index, { uploading: true });
    const result = await uploadReceipt(job.reference, file);
    setParts((current) =>
      current.map((part) =>
        part.key === key ? { ...part, uploading: false, receipt: result.ok ? result.receipt : part.receipt } : part,
      ),
    );
    if (result.ok) {
      setErrors((current) => {
        const rest = { ...current };
        delete rest[`part.${String(index)}.receipt`];
        return rest;
      });
    } else {
      setReceiptMessages((current) => ({ ...current, [key]: result.message }));
    }
  }

  return (
    <>
      <div className="grid items-start gap-4 pb-28 md:pb-0 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {banner ? (
          <p role="alert" className="col-span-full rounded-md border border-error-border bg-error-bg px-3 py-2.5 text-[13px] text-brand-destructive">
            {banner}
          </p>
        ) : null}

        <div className="order-1 min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-3">
          <Card title="The job">
            <div className="grid grid-cols-2 gap-x-4.5 gap-y-3.5">
              <Fact label="Booked for">{job.slotLabel ?? "No date yet"}</Fact>
              <Fact label="Ask for">{job.contactLine}</Fact>
              <div className="col-span-2">
                <Fact label="Site address">{job.addressLine}</Fact>
              </div>
              <div className="col-span-2">
                <Fact label="What the customer said">
                  <p className="max-w-[62ch] font-normal whitespace-pre-wrap">{job.description ?? "-"}</p>
                  {job.answers.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4.5 font-normal">
                      {job.answers.map((answer) => (
                        <li key={answer}>{answer}</li>
                      ))}
                    </ul>
                  ) : null}
                </Fact>
              </div>
            </div>
            {job.instructions.length > 0 ? (
              <>
                <div className="mt-3.5 mb-3 border-t border-hairline" />
                <h3 className={labelClass}>From the office</h3>
                <div className="mt-1.5 flex flex-col gap-2">
                  {job.instructions.map((note, index) => (
                    <div key={index} className="rounded-md border border-hairline bg-ground px-3 py-2.5 text-sm text-ink">
                      <span className="whitespace-pre-wrap">{note.note}</span>
                      <div className="mt-1 text-xs text-muted-text">
                        {note.authorFirstName}, {note.dateLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {job.canOnSite && !frozen ? (
              <button
                type="button"
                onClick={() => void onSite()}
                disabled={busy !== null}
                className="mt-3.5 min-h-11 rounded-md border border-hairline bg-surface px-[18px] py-2.5 text-sm font-bold text-ink disabled:opacity-50"
              >
                On site
              </button>
            ) : null}
          </Card>
        </div>

        <div className="order-2 min-w-0 xl:col-start-1 xl:row-start-1">
          <Card title="Time on site" aside={`Billed ${formatHours(billed)}h`}>
            <TimeEntryRows
              rows={rows}
              mode={frozen ? "frozen" : "edit"}
              zone={job.timezone}
              idPrefix="entry"
              errors={errors}
              onChange={(next) => {
                setRows(next);
                setErrors({});
              }}
            />
          </Card>
        </div>

        <div className="order-3 min-w-0 xl:col-start-1 xl:row-start-2">
          <Card title="Work done">
            {frozen ? (
              <LockedValue label="Completion notes" value={notes === "" ? "-" : notes} message />
            ) : (
              <div className="mb-3.5">
                <label htmlFor="completion-notes" className={`mb-[5px] ${labelClass} ${starClass}`}>
                  Completion notes
                </label>
                <textarea
                  id="completion-notes"
                  rows={4}
                  value={notes}
                  aria-invalid={errors["notes"] ? true : undefined}
                  aria-required
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setErrors((current) => ({ ...current, notes: "" }));
                  }}
                  className={`min-h-[96px] w-full resize-y rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                    errors["notes"] ? "border-brand-destructive" : "border-hairline"
                  }`}
                />
                {errors["notes"] ? <p className="mt-[5px] text-xs text-brand-destructive">{errors["notes"]}</p> : null}
              </div>
            )}
          </Card>
        </div>

        <div className="order-4 min-w-0 xl:col-start-1 xl:row-start-3">
          <Card title="Parts used" aside={`Up to ${capLabel} a line`}>
            {parts.length === 0 && frozen ? <p className="text-[13px] text-muted-text">No parts.</p> : null}
            {parts.map((part, index) => {
              const at = (field: string): string | undefined => errors[`part.${String(index)}.${field}`] || undefined;
              const id = `part-${String(index)}`;
              return (
                <div key={part.key} className={index > 0 ? "mt-3.5 border-t border-hairline pt-3.5" : undefined} data-testid="part-row">
                  {frozen ? (
                    <>
                      <LockedValue label="Part" value={part.name} />
                      <div className="grid grid-cols-2 gap-x-3.5">
                        <LockedValue label="Qty" value={part.qty} />
                        <LockedValue label="Price each" value={`$${part.price}`} />
                      </div>
                      <div className="mb-3.5">
                        <span className={`${labelClass} mb-[5px]`}>Receipt photo</span>
                        {part.receipt && part.receipt.fullUrl ? (
                          <a href={part.receipt.fullUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${part.receipt.fileName}`} className="block size-24 overflow-hidden rounded-md border border-hairline">
                            {/* eslint-disable-next-line @next/next/no-img-element -- a Cloudinary thumbnail */}
                            <img src={part.receipt.thumbnailUrl} alt={part.receipt.fileName} className="size-full object-cover" />
                          </a>
                        ) : (
                          <p className="text-[13px] text-muted-text">{part.receipt?.fileName ?? "-"}</p>
                        )}
                        <p className="mt-[5px] text-xs text-muted-text">{FROZEN_MESSAGE}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Field
                        id={`${id}-name`}
                        label="Part"
                        required
                        value={part.name}
                        error={at("name")}
                        onChange={(e) => updatePart(index, { name: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-x-3.5">
                        <Field
                          id={`${id}-qty`}
                          label="Qty"
                          required
                          inputMode="decimal"
                          value={part.qty}
                          error={at("qty")}
                          onChange={(e) => updatePart(index, { qty: e.target.value })}
                        />
                        <Field
                          id={`${id}-price`}
                          label="Price each"
                          required
                          prefix="$"
                          inputMode="decimal"
                          value={part.price}
                          error={at("price")}
                          onChange={(e) => updatePart(index, { price: e.target.value })}
                        />
                      </div>
                      <div className="mb-3.5">
                        <span className={`mb-[5px] ${labelClass} ${starClass}`}>Receipt photo</span>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <button
                            type="button"
                            disabled={part.uploading}
                            onClick={() => fileInputs.current[part.key]?.click()}
                            className="min-h-[52px] w-full rounded-md border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-50 md:min-h-11 md:w-auto"
                          >
                            {part.uploading ? "Uploading..." : part.receipt ? "Choose another" : "Choose file"}
                          </button>
                          <input
                            ref={(el) => {
                              fileInputs.current[part.key] = el;
                            }}
                            type="file"
                            accept="image/*"
                            aria-label={`Receipt photo for part ${String(index + 1)}`}
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void chooseReceipt(index, part.key, file);
                            }}
                          />
                          <span className={`truncate text-sm ${part.receipt ? "text-ink" : "text-muted-text"}`} title={part.receipt?.fileName}>
                            {part.receipt ? part.receipt.fileName : "No file chosen"}
                          </span>
                        </div>
                        {at("receipt") ? <p className="mt-[5px] text-xs text-brand-destructive">{at("receipt")}</p> : null}
                        {receiptMessages[part.key] ? <p className="mt-[5px] text-xs text-brand-destructive">{receiptMessages[part.key]}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setParts((current) => current.filter((_, i) => i !== index))}
                        className="min-h-11 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
                      >
                        Remove part
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {!frozen ? (
              <button
                type="button"
                onClick={() => setParts((current) => [...current, newPart()])}
                className="min-h-11 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
              >
                + Add a part
              </button>
            ) : null}
          </Card>
        </div>
      </div>

      {!frozen ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface px-4 pt-3 pb-5 md:static md:mt-3.5 md:border-0 md:bg-transparent md:p-0">
          <div className="flex flex-wrap items-center gap-2.5 md:flex-nowrap md:justify-end">
            {changed ? (
              <span className="order-first mb-0.5 w-full text-center text-xs text-brand-warning md:order-none md:mb-0 md:w-auto">
                Not saved yet
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void send(false)}
              disabled={!changed || busy !== null || uploading}
              className={`min-h-[52px] flex-1 rounded-md px-4 text-sm font-bold md:min-h-11 md:flex-none ${
                changed ? "border border-hairline bg-surface text-ink" : "bg-hairline text-muted-text"
              } disabled:cursor-not-allowed`}
            >
              {busy === "save" ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                const problems = check(true);
                setErrors(problems);
                setBanner(undefined);
                if (Object.keys(problems).length === 0) setConfirming(true);
              }}
              disabled={busy !== null || uploading}
              className="min-h-[52px] flex-[2] rounded-md bg-brand-success px-4 text-sm font-bold text-white disabled:opacity-50 md:min-h-11 md:flex-none"
            >
              Complete job
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={`Complete ${job.reference}?`}
        confirmLabel="Complete"
        tone="success"
        loading={busy === "complete"}
        loadingLabel="Completing..."
        onConfirm={() => void send(true)}
        onCancel={() => setConfirming(false)}
      >
        Your times, notes and parts lock once you complete.
      </ConfirmDialog>
      <Toast message={toastMessage} />
    </>
  );
}
