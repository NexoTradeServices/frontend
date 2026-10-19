// The ops Settlements screen -- Feature 6003, settlement run.
//
// Contractor Settlement (the payout run: on-screen list + CSV; Rebuild beside an unapproved
// draft). frontend-conventions.md: Templates / Layouts (List page), Molecules / Finding and
// filtering (Filter row - one pill at a time, a count after each label), Molecules / Showing
// values (Fact grid), Organisms / Lists and tables (List table in a Card, which becomes Record
// cards on Mobile; a summary row expands into its member rows; "Download CSV" beside the title),
// Organisms / Dialogs and bars (Standard dialog), Molecules / Messages to the person (Toast,
// Empty state). Ops pages are designed at Desktop first; Mobile is best effort.
"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "@/components/auth/banner";
import { PrimaryButton } from "@/components/auth/buttons";
import { Field } from "@/components/auth/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterRow } from "@/components/ui/filter-row";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { typedDollarsToCents } from "@/components/refunds/money";
import { Toast, useToast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/download";
import { InvoiceCard } from "./invoice-card";
import { formatPay } from "./money";
import type { AdjustmentContractor, AdjustmentLanding, OpsDetail, OpsList, OpsRow, OpsView, UpcomingRow } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const labelClass = "block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
const tagClass = "inline-block shrink-0 rounded px-2 py-0.5 text-field-label font-bold tracking-[0.04em] whitespace-nowrap uppercase";
const warningTag = `${tagClass} bg-warning-bg text-brand-warning`;
const th = "border-b border-hairline px-3 py-2.5 text-left align-bottom text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
const td = "border-b border-hairline px-3 py-2.5 align-top text-secondary-text";
const textButton = "inline-flex min-h-11 items-center text-small font-semibold text-secondary-text underline underline-offset-2";

const PILLS: { view: OpsView; label: string }[] = [
  { view: "ready", label: "Ready to pay" },
  { view: "awaiting", label: "Awaiting approval" },
  { view: "upcoming", label: "Not yet invoiced" },
  { view: "paid", label: "Paid" },
];

const TITLES: Record<OpsView, string> = {
  ready: "Ready to pay",
  awaiting: "Awaiting approval",
  upcoming: "Not yet invoiced",
  paid: "Paid",
};

const EMPTY: Record<OpsView, string> = {
  ready: "Nothing approved to pay yet.",
  awaiting: "No drafts waiting.",
  upcoming: "No unpaid work since the last run.",
  paid: "Nothing paid yet.",
};

async function fetchList(view: OpsView, after?: string): Promise<OpsList> {
  const query = new URLSearchParams({ view });
  if (after) query.set("after", after);
  const res = await fetch(`${apiUrl}/api/settlements?${query.toString()}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`settlements read failed: ${String(res.status)}`);
  return (await res.json()) as OpsList;
}

async function fetchDetail(reference: string): Promise<OpsDetail> {
  const res = await fetch(`${apiUrl}/api/settlements/${encodeURIComponent(reference)}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`settlement read failed: ${String(res.status)}`);
  return (await res.json()) as OpsDetail;
}

async function post(reference: string, action: "mark-paid" | "rebuild"): Promise<{ ok: boolean; body: { error?: string; reference?: string } }> {
  const res = await fetch(`${apiUrl}/api/settlements/${encodeURIComponent(reference)}/${action}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return { ok: res.ok, body: (await res.json()) as { error?: string; reference?: string } };
}

function EmptyState({ view }: { view: OpsView }) {
  return (
    <div data-testid="settlements-empty" className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-secondary-text">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-muted-text" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p>{EMPTY[view]}</p>
    </div>
  );
}

/** What opens under a row: the invoice's own lines. */
function Drilldown({ reference }: { reference: string }) {
  const [detail, setDetail] = useState<OpsDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    fetchDetail(reference).then(
      (result) => {
        if (current) setDetail(result);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [reference]);
  if (failed) return <p className="text-small text-brand-destructive">The invoice could not be opened - try again.</p>;
  if (detail === null) return <p className="text-small text-muted-text">Opening...</p>;
  return <InvoiceCard invoice={detail.invoice} />;
}

interface RowActions {
  onMarkPaid: (row: OpsRow) => void;
  onRebuild: (row: OpsRow) => void;
}

function RowTags({ row }: { row: OpsRow }) {
  return (
    <>
      {row.gstNotRecorded ? <span className={warningTag}>GST not recorded</span> : null}
    </>
  );
}

function RowAction({ view, row, actions }: { view: OpsView; row: OpsRow; actions: RowActions }) {
  if (view === "ready") {
    return (
      <button type="button" className={textButton} onClick={(event) => { event.stopPropagation(); actions.onMarkPaid(row); }}>
        Mark paid
      </button>
    );
  }
  if (view === "awaiting") {
    return (
      <button type="button" className={textButton} onClick={(event) => { event.stopPropagation(); actions.onRebuild(row); }}>
        Rebuild
      </button>
    );
  }
  return null;
}

function ColumnHeads({ view }: { view: OpsView }) {
  switch (view) {
    case "ready":
      return (
        <>
          <th className={th}>Contractor</th>
          <th className={th}>Invoice</th>
          <th className={th}>BSB</th>
          <th className={th}>Account</th>
          <th className={`${th} text-right`}>Amount</th>
          <th className={th}>Approved</th>
        </>
      );
    case "awaiting":
      return (
        <>
          <th className={th}>Contractor</th>
          <th className={th}>Invoice</th>
          <th className={th}>Period</th>
          <th className={th}>Jobs</th>
          <th className={`${th} text-right`}>Amount</th>
          <th className={th}>Made</th>
        </>
      );
    default:
      return (
        <>
          <th className={th}>Contractor</th>
          <th className={th}>Invoice</th>
          <th className={th}>Period</th>
          <th className={`${th} text-right`}>Amount</th>
          <th className={th}>Paid on</th>
          <th className={th}>Paid by</th>
        </>
      );
  }
}

function Cells({ view, row }: { view: OpsView; row: OpsRow }) {
  const reference = <td className={td}><span className="font-heading text-small font-extrabold text-ink">{row.reference}</span></td>;
  const name = <td className={`${td} font-semibold text-ink`}>{row.contractor.name}</td>;
  const amount = <td className={`${td} text-right font-semibold whitespace-nowrap text-ink tabular-nums`}>{formatPay(row.amount)}</td>;
  if (view === "ready") {
    return (
      <>
        {name}
        {reference}
        <td className={`${td} whitespace-nowrap tabular-nums`}>{row.bsb ?? "-"}</td>
        <td className={`${td} whitespace-nowrap tabular-nums`}>{row.account ?? "-"}</td>
        {amount}
        <td className={`${td} whitespace-nowrap tabular-nums`}>{row.approvedLabel ?? "-"}</td>
      </>
    );
  }
  if (view === "awaiting") {
    return (
      <>
        <td className={`${td} font-semibold text-ink`}>
          {row.contractor.name}
          <span className="mt-1 flex flex-wrap gap-1.5">
            <RowTags row={row} />
          </span>
        </td>
        {reference}
        <td className={`${td} whitespace-nowrap`}>{row.period}</td>
        <td className={`${td} tabular-nums`}>{row.jobs}</td>
        {amount}
        <td className={`${td} whitespace-nowrap tabular-nums`}>{row.madeLabel}</td>
      </>
    );
  }
  return (
    <>
      {name}
      {reference}
      <td className={`${td} whitespace-nowrap`}>{row.period}</td>
      {amount}
      <td className={`${td} whitespace-nowrap tabular-nums`}>{row.paidLabel ?? "-"}</td>
      <td className={td}>{row.paidBy ?? "-"}</td>
    </>
  );
}

function InvoiceTable({ view, rows, actions }: { view: OpsView; rows: OpsRow[]; actions: RowActions }) {
  const [open, setOpen] = useState<string | null>(null);
  const hasAction = view === "ready" || view === "awaiting";
  const columns = 6 + (hasAction ? 1 : 0);
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-sm" data-testid="settlements-table">
        <thead>
          <tr>
            <ColumnHeads view={view} />
            {hasAction ? <th className={th}><span className="sr-only">Action</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.reference}>
              <tr
                data-ref={row.reference}
                tabIndex={0}
                aria-expanded={open === row.reference}
                onClick={() => setOpen(open === row.reference ? null : row.reference)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setOpen(open === row.reference ? null : row.reference);
                }}
                className="cursor-pointer outline-none hover:bg-ground focus-visible:bg-ground"
              >
                <Cells view={view} row={row} />
                {hasAction ? (
                  <td className={`${td} text-right whitespace-nowrap`}>
                    <RowAction view={view} row={row} actions={actions} />
                  </td>
                ) : null}
              </tr>
              {open === row.reference ? (
                <tr data-testid="drilldown">
                  <td colSpan={columns} className="border-b border-hairline bg-ground px-3 py-3">
                    <Drilldown reference={row.reference} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceCards({ view, rows, actions }: { view: OpsView; rows: OpsRow[]; actions: RowActions }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5 md:hidden" data-testid="settlements-cards">
      {rows.map((row) => (
        <div key={row.reference} data-ref={row.reference} className="rounded-card border border-hairline bg-surface p-3.5">
          <button
            type="button"
            aria-expanded={open === row.reference}
            onClick={() => setOpen(open === row.reference ? null : row.reference)}
            className="block min-h-11 w-full text-left"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-heading text-small font-extrabold text-ink">{row.reference}</span>
              <span className="flex flex-wrap justify-end gap-1.5">
                <RowTags row={row} />
              </span>
            </span>
            <span className="mt-1.5 mb-0.5 block text-name font-bold text-ink">{row.contractor.name}</span>
            <span className="block text-small text-muted-text">
              <span className="block font-semibold text-secondary-text tabular-nums">{formatPay(row.amount)}</span>
              {view === "ready" ? <span className="block tabular-nums">BSB {row.bsb ?? "-"} - account {row.account ?? "-"}</span> : <span className="block">{row.period}</span>}
              {view === "paid" ? <span className="block">Paid {row.paidLabel ?? "-"} by {row.paidBy ?? "-"}</span> : null}
            </span>
          </button>
          <RowAction view={view} row={row} actions={actions} />
          {open === row.reference ? (
            <div className="mt-2" data-testid="drilldown">
              <Drilldown reference={row.reference} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** A signed amount for the Adjustments column: "+$25", "-$100", "$0" when nothing waits. */
function formatSigned(cents: number): string {
  if (cents === 0) return formatPay(0);
  return `${cents < 0 ? "-" : "+"}${formatPay(Math.abs(cents))}`;
}

function UpcomingTable({ rows }: { rows: UpcomingRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" data-testid="settlements-table">
          <thead>
            <tr>
              <th className={th}>Contractor</th>
              <th className={th}>Jobs</th>
              <th className={`${th} text-right`}>Work</th>
              <th className={`${th} text-right`}>Adjustments</th>
              <th className={`${th} text-right`}>Payout</th>
              <th className={th}>Invoiced on</th>
              <th className={th}>Paid on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.contractor.code} data-ref={row.contractor.code}>
                <td className={`${td} font-semibold text-ink`}>{row.contractor.name}</td>
                <td className={`${td} tabular-nums`}>{row.jobs}</td>
                <td className={`${td} text-right whitespace-nowrap tabular-nums`} data-testid="upcoming-work">{formatPay(row.work)}</td>
                <td className={`${td} text-right whitespace-nowrap tabular-nums`} data-testid="upcoming-adjustments">{formatSigned(row.adjustments)}</td>
                <td className={`${td} text-right font-semibold whitespace-nowrap text-ink tabular-nums`} data-testid="upcoming-payout">{formatPay(row.payout)}</td>
                <td className={`${td} whitespace-nowrap`}>{row.invoicedOn}</td>
                <td className={`${td} whitespace-nowrap`}>{row.paidOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5 md:hidden" data-testid="settlements-cards">
        {rows.map((row) => (
          <div key={row.contractor.code} data-ref={row.contractor.code} className="rounded-card border border-hairline bg-surface p-3.5">
            <span className="block text-name font-bold text-ink">{row.contractor.name}</span>
            <span className="block text-small text-muted-text">
              <span className="block font-semibold text-secondary-text tabular-nums">
                {formatPay(row.payout)} - {row.jobs} {row.jobs === 1 ? "job" : "jobs"}
              </span>
              <span className="block tabular-nums">
                Work {formatPay(row.work)}, adjustments {formatSigned(row.adjustments)}
              </span>
              <span className="block">Invoiced {row.invoicedOn}, paid {row.paidOn}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Feature 6007: Add pay adjustment (Contractor Settlement, Pay adjustments and corrections). A Standard
 * Dialog: Contractor, Amount, Job (optional), Reason, one muted line saying where it will land, and
 * Cancel / Add. The landing line is read from the server as soon as a contractor is picked, so Mike knows
 * which draft it goes on before he presses Add.
 */
function AddAdjustmentDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (firstName: string) => void;
}) {
  // Mounted only while open, so every opening starts from empty boxes.
  return open ? <AdjustmentForm onClose={onClose} onAdded={onAdded} /> : null;
}

function AdjustmentForm({ onClose, onAdded }: { onClose: () => void; onAdded: (firstName: string) => void }) {
  const [contractors, setContractors] = useState<AdjustmentContractor[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [amount, setAmount] = useState("");
  const [job, setJob] = useState("");
  const [reason, setReason] = useState("");
  const [landing, setLanding] = useState<AdjustmentLanding | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    fetch(`${apiUrl}/api/settlements/adjustments/contractors`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok || !current) return;
        setContractors(((await res.json()) as { contractors: AdjustmentContractor[] }).contractors);
      })
      .catch(() => {
        if (current) setRefusal("The contractors could not be read - close this and try again.");
      });
    return () => {
      current = false;
    };
  }, []);

  /** Picking a contractor reads where the line would land, so Mike sees it before he presses Add. */
  function choose(id: string) {
    setContractorId(id);
    setErrors((previous) => ({ ...previous, contractor: "" }));
    setLanding(null);
    if (id === "") return;
    fetch(`${apiUrl}/api/settlements/adjustments/landing?contractorId=${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (res.ok) setLanding((await res.json()) as AdjustmentLanding);
      })
      .catch(() => undefined);
  }

  const chosen = contractors.find((contractor) => contractor.id === contractorId);

  async function add() {
    setRefusal(undefined);
    const next: Record<string, string> = {};
    if (contractorId === "") next["contractor"] = "Required.";
    const cents = typedDollarsToCents(amount);
    if (cents === null || cents <= 0) next["amount"] = "Enter an amount more than $0.";
    if (reason.trim() === "") next["reason"] = "Required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/settlements/adjustments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, amount: cents, reason: reason.trim(), job: job.trim() }),
      });
      const payload = (await res.json()) as { error?: string; field?: string; contractorFirstName?: string };
      if (!res.ok) {
        if (payload.field !== undefined) setErrors({ [payload.field]: payload.error ?? "Check this." });
        else setRefusal(payload.error ?? "That did not go through. Please try again.");
        return;
      }
      onAdded(payload.contractorFirstName ?? chosen?.firstName ?? "their");
    } catch {
      setRefusal("That did not go through - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfirmDialog
      open
      title="Add pay adjustment"
      confirmLabel="Add"
      loading={saving}
      loadingLabel="Adding..."
      onConfirm={() => void add()}
      onCancel={onClose}
      fields={
        <div data-testid="adjustment-dialog">
          {refusal ? (
            <p role="alert" className="mb-3 rounded-button border border-error-border bg-error-bg px-3 py-2.5 text-small text-brand-destructive">
              {refusal}
            </p>
          ) : null}
          <SelectField
            id="adjustment-contractor"
            label="Contractor"
            required
            value={contractorId}
            onChange={(event) => choose(event.target.value)}
            error={errors["contractor"] || undefined}
            options={[{ value: "", label: "Choose a contractor" }, ...contractors.map((contractor) => ({ value: contractor.id, label: contractor.name }))]}
          />
          <Field
            id="adjustment-amount"
            label="Amount"
            required
            prefix="$"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((previous) => ({ ...previous, amount: "" }));
            }}
            error={errors["amount"] || undefined}
          />
          <Field
            id="adjustment-job"
            label="Job"
            placeholder="JOB-1042"
            value={job}
            onChange={(event) => {
              setJob(event.target.value);
              setErrors((previous) => ({ ...previous, job: "" }));
            }}
            error={errors["job"] || undefined}
          />
          <div className="mb-3.5">
            <label
              htmlFor="adjustment-reason"
              className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase after:ml-0.5 after:text-brand-destructive after:content-['*']"
            >
              Reason
            </label>
            <textarea
              id="adjustment-reason"
              rows={3}
              maxLength={500}
              value={reason}
              aria-required
              aria-invalid={errors["reason"] ? true : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                setErrors((previous) => ({ ...previous, reason: "" }));
              }}
              className={`w-full rounded-button border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
                errors["reason"] ? "border-brand-destructive" : "border-hairline"
              }`}
            />
            {errors["reason"] ? (
              <p className="mt-[5px] text-xs text-brand-destructive">{errors["reason"]}</p>
            ) : chosen ? (
              <p className="mt-[5px] text-xs text-muted-text">Internal note. {chosen.firstName} does not see this.</p>
            ) : null}
          </div>
          <p data-testid="adjustment-landing" className="text-small text-muted-text">
            {landing?.sentence ?? "Choose a contractor to see where it will land."}
          </p>
        </div>
      }
    >
      Extra pay for something no visit carries - parking, a long drive, a bonus. It only ever adds.
    </ConfirmDialog>
  );
}

export function OpsSettlements({ initial }: { initial: OpsList }) {
  const [data, setData] = useState<OpsList>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState<OpsRow | null>(null);
  const [rebuilding, setRebuilding] = useState<OpsRow | null>(null);
  const [working, setWorking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, showToast] = useToast();
  const requestId = useRef(0);

  const load = useCallback(async (view: OpsView) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchList(view);
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch {
      if (id !== requestId.current) return;
      setError("The list could not be read - check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  async function loadMore() {
    if (data.nextCursor === null) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchList(data.view, data.nextCursor);
      if (id !== requestId.current) return;
      setData((previous) => {
        const seen = new Set(previous.rows.map((row) => row.reference));
        return { ...result, rows: [...previous.rows, ...result.rows.filter((row) => !seen.has(row.reference))] };
      });
    } catch {
      setError("More invoices could not be loaded - check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(kind: "mark-paid" | "rebuild", row: OpsRow) {
    setWorking(true);
    try {
      const result = await post(row.reference, kind);
      setPaying(null);
      setRebuilding(null);
      if (!result.ok) {
        setError(result.body.error ?? "That did not go through - try again.");
      } else {
        setError(null);
        showToast(kind === "mark-paid" ? `${row.reference} marked paid.` : `Rebuilt as ${result.body.reference ?? "a new draft"}.`);
      }
      await load(data.view);
    } catch {
      setPaying(null);
      setRebuilding(null);
      setError("That did not go through - check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function downloadCsv() {
    try {
      await downloadFile("/api/settlements/ready.csv", "payout-run.csv");
    } catch {
      setError("The CSV could not be downloaded - try again.");
    }
  }

  const actions: RowActions = { onMarkPaid: setPaying, onRebuild: setRebuilding };
  const view = data.view;

  return (
    <>
    <PageHeader
      title="Payouts"
      subtitle="Pay the approved invoices on pay day, then mark each one paid."
      action={
        <PrimaryButton type="button" size="compact" onClick={() => setAdding(true)}>
          Add pay adjustment
        </PrimaryButton>
      }
    />
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4.5 gap-y-3.5 sm:grid-cols-4" data-testid="settlements-facts">
        <div>
          <span className={labelClass}>Ready to pay</span>
          <div className="font-semibold text-ink tabular-nums" data-testid="ready-count">
            {data.facts.readyCount}
          </div>
        </div>
        <div>
          <span className={labelClass}>To pay in total</span>
          <div className="font-semibold text-ink tabular-nums" data-testid="ready-total">
            {formatPay(data.facts.readyTotal)}
          </div>
        </div>
        <div>
          <span className={labelClass}>Pay day</span>
          <div className="font-semibold text-ink" data-testid="pay-day">
            {data.facts.payDay}
          </div>
        </div>
      </div>

      <FilterRow
        label="Show"
        pills={PILLS.map((pill) => ({ key: pill.view, label: pill.label, count: data.counts[pill.view] }))}
        chosen={view}
        onChoose={(key) => void load(key as OpsView)}
      />

      {error ? <Banner kind="error">{error}</Banner> : null}

      <section className="rounded-card border border-hairline bg-surface p-4 md:p-5" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-extrabold text-ink">{TITLES[view]}</h2>
          {view === "ready" ? (
            <button type="button" className={textButton} onClick={() => void downloadCsv()}>
              Download CSV
            </button>
          ) : null}
        </div>
        <div className="mt-3.5">
          {view === "upcoming" ? (
            data.upcoming.length === 0 ? <EmptyState view={view} /> : <UpcomingTable rows={data.upcoming} />
          ) : data.rows.length === 0 ? (
            <EmptyState view={view} />
          ) : (
            <>
              <InvoiceTable view={view} rows={data.rows} actions={actions} />
              <InvoiceCards view={view} rows={data.rows} actions={actions} />
            </>
          )}
        </div>
      </section>

      {data.nextCursor !== null ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="min-h-11 w-full rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-60 md:w-auto md:self-center"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      ) : null}

      <ConfirmDialog
        open={paying !== null}
        title={`Mark ${paying?.reference ?? ""} paid?`}
        confirmLabel="Mark paid"
        loading={working}
        loadingLabel="Marking paid..."
        onConfirm={() => paying && void confirmAction("mark-paid", paying)}
        onCancel={() => setPaying(null)}
      >
        {paying ? (
          <p data-testid="mark-paid-body">
            {`${formatPay(paying.amount)} to ${paying.contractor.name}, BSB ${paying.bsb ?? "-"}, account ${paying.account ?? "-"}. Use ${paying.reference} as the bank reference. ${paying.contractor.firstName} gets an email saying they've been paid.`}
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={rebuilding !== null}
        title={`Rebuild ${rebuilding?.reference ?? ""}?`}
        confirmLabel="Rebuild"
        loading={working}
        loadingLabel="Rebuilding..."
        onConfirm={() => rebuilding && void confirmAction("rebuild", rebuilding)}
        onCancel={() => setRebuilding(null)}
      >
        {rebuilding ? (
          <p data-testid="rebuild-body">
            {`It is replaced by a new draft with the jobs as they stand now, and ${rebuilding.contractor.firstName} gets a fresh email. The old link stops working.`}
          </p>
        ) : null}
      </ConfirmDialog>

      <AddAdjustmentDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(firstName) => {
          setAdding(false);
          showToast(`Added - on ${firstName}'s next payout.`);
          void load(data.view);
        }}
      />

      <Toast message={toast} />
    </div>
    </>
  );
}
