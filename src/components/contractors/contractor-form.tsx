// The contractor form -- Feature 2001, contractor onboarding (Mike's path).
//
// Two pages, one form (plan decision 1): /new and /[code] render this same
// component, blank or filled. Card order (Contractor, Login, Personal
// details, Trades, Insurance, Payout, Status), field labels/placeholders/
// helper copy and every toast/dialog string are taken verbatim from the
// Contractor onboarding flow walkthrough, 03 Sep 2026 (plan.md, Quick
// fixes) -- not re-decided here.
//
// Decision 3: Ready to dispatch is server-computed and the screen only
// renders it -- the banner and header tags read `contractor.ready` /
// `.missing` from the last GET/POST/PUT response, never a client-side
// recomputation, so there is exactly one place the rule lives.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/auth/field";
import { PlacesField, type PickedAddress } from "@/components/ui/places-field";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Banner } from "@/components/auth/banner";
import { Toast, useToast } from "@/components/ui/toast";
import { TradeRows, emptyTradeRow, type TradeRowDraft, type TradeRowErrors } from "./trade-rows";
import { dispatchState, fmtDate, isFutureDate, type ApiFieldError, type ContractorDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(value: string): number | null {
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0 || value.trim() === "") return null;
  return Math.round(dollars * 100);
}

function tradeRowFromDto(specialty: ContractorDto["specialties"][number], key: string): TradeRowDraft {
  return {
    key,
    trade: specialty.trade,
    callout: centsToDollars(specialty.contractorCalloutRate),
    standard: centsToDollars(specialty.contractorStandardRate),
    licenceNumber: specialty.licenceNumber,
    licenceExpiry: specialty.licenceExpiry,
    active: specialty.status === "active",
    lastSavedActive: specialty.status === "active",
    existing: true,
    statusCaption: specialty.statusChangedAt
      ? `${specialty.status === "active" ? "Reactivated" : "Suspended"} ${fmtDate(specialty.statusChangedAt)}${
          specialty.statusChangedByName ? ` by ${specialty.statusChangedByName}` : ""
        }`
      : null,
  };
}

interface Fields {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  abn: string;
  gstRegistered: boolean;
  address: PickedAddress | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insurer: string;
  insurancePolicyNo: string;
  insuranceExpiry: string;
  payoutBsb: string;
  payoutAccountNo: string;
  payoutAccountName: string;
}

function fieldsFromDto(dto: ContractorDto): Fields {
  return {
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    businessName: dto.businessName ?? "",
    abn: dto.abn ?? "",
    gstRegistered: dto.gstRegistered,
    address: dto.address,
    emergencyContactName: dto.emergencyContactName ?? "",
    emergencyContactPhone: dto.emergencyContactPhone ?? "",
    insurer: dto.insurer ?? "",
    insurancePolicyNo: dto.insurancePolicyNo ?? "",
    insuranceExpiry: dto.insuranceExpiry ?? "",
    payoutBsb: dto.payoutBsb ?? "",
    payoutAccountNo: dto.payoutAccountNo ?? "",
    payoutAccountName: dto.payoutAccountName ?? "",
  };
}

const BLANK_FIELDS: Fields = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  abn: "",
  gstRegistered: false,
  address: null,
  emergencyContactName: "",
  emergencyContactPhone: "",
  insurer: "",
  insurancePolicyNo: "",
  insuranceExpiry: "",
  payoutBsb: "",
  payoutAccountNo: "",
  payoutAccountName: "",
};

// Ready banner text -- design: Managing the contractor record, "Ready is
// contractor-level; each trade shows its own state" (settled 04/09/26, Q1).
// Ready to dispatch stays contractor-level ("dispatchable for at least one
// trade"); when every trade agrees the plain banner stands, otherwise it
// names the exception in one line.
function readyBannerText(contractor: ContractorDto): string {
  const withState = contractor.specialties.map((s) => ({ s, state: dispatchState(s.status === "active", s.licenceExpiry) }));
  const exceptions = withState.filter((x) => x.state !== "dispatchable");
  if (exceptions.length === 0) return "Ready to dispatch. Everything the platform checks is in place.";
  const dispatchable = withState.filter((x) => x.state === "dispatchable").map((x) => x.s.trade);
  const exceptionText = exceptions
    .map((x) => `${x.s.trade}: ${x.state === "expired" ? "licence expired" : "suspended"}.`)
    .join(" ");
  return `Ready to dispatch for ${dispatchable.join(", ")}. ${exceptionText}`;
}

function tagClasses(kind: "active" | "suspended" | "ready" | "notready"): string {
  const base = "inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase";
  if (kind === "active" || kind === "ready") return `${base} bg-success-bg text-brand-success`;
  if (kind === "notready") return `${base} bg-warning-bg text-brand-warning`;
  return `${base} bg-ground text-muted-text`;
}

export function ContractorForm({ mode, initial, tradeOptions }: { mode: "create" | "edit"; initial: ContractorDto | null; tradeOptions: string[] }) {
  const router = useRouter();
  const [contractor, setContractor] = useState<ContractorDto | null>(initial);
  const [fields, setFields] = useState<Fields>(initial ? fieldsFromDto(initial) : BLANK_FIELDS);
  const [trades, setTrades] = useState<TradeRowDraft[]>(
    initial ? initial.specialties.map((s, i) => tradeRowFromDto(s, `row-${String(i)}`)) : [emptyTradeRow("row-0")],
  );
  const [activeState, setActiveState] = useState(initial ? initial.status === "active" : true);
  const [addressError, setAddressError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tradeErrors, setTradeErrors] = useState<Record<string, TradeRowErrors>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  // True while a just-clicked Places suggestion's network round-trip is
  // still resolving -- Save is held off until it settles, so a fast click
  // right after picking can never save with the address still unset
  // underneath (the visible text updates before that round-trip finishes).
  const [addressPicking, setAddressPicking] = useState(false);
  const [toastMessage, showToast] = useToast();

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  interface ValidationResult {
    ok: boolean;
    fieldErrors: Record<string, string>;
    tradeErrors: Record<string, TradeRowErrors>;
    payload?: Record<string, unknown>;
  }

  // `activeOverride` covers the Status switch's instant-apply path: it calls
  // setActiveState(nextActive) and immediately runs this in the SAME tick --
  // React does not apply that state update until the next render, so
  // `activeState` in THIS closure is still the value from before the click.
  // Reading `activeOverride` first is what makes the PUT actually carry the
  // status the click asked for, instead of silently re-sending the old one.
  function validate(activeOverride?: boolean): ValidationResult {
    const errs: Record<string, string> = {};
    const trErrs: Record<string, TradeRowErrors> = {};

    if (fields.name.trim() === "") errs["name"] = "Required.";
    if (fields.phone.trim() === "") errs["phone"] = "Required.";
    const email = fields.email.trim().toLowerCase();
    if (email === "") errs["email"] = "Required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs["email"] = "That does not look like an email address.";

    if (fields.abn.trim() !== "" && !/^\d{11}$/.test(fields.abn.replace(/\s/g, ""))) {
      errs["abn"] = "An ABN is 11 digits.";
    }
    if (fields.payoutBsb.trim() !== "" && !/^\d{6}$/.test(fields.payoutBsb.replace(/[\s-]/g, ""))) {
      errs["payoutBsb"] = "A BSB is six digits.";
    }
    const specialties: Record<string, unknown>[] = [];
    for (const row of trades) {
      const anyFilled = [row.trade, row.callout, row.standard, row.licenceNumber, row.licenceExpiry].some(
        (v) => v.trim() !== "",
      );
      if (!anyFilled) continue;
      const rowErr: TradeRowErrors = {};
      if (row.trade.trim() === "") rowErr.trade = "Required.";
      const callout = dollarsToCents(row.callout);
      if (callout === null) rowErr.callout = "Required.";
      const standard = dollarsToCents(row.standard);
      if (standard === null) rowErr.standard = "Required.";
      if (row.licenceNumber.trim() === "") rowErr.licenceNumber = "Required.";
      if (row.licenceExpiry.trim() === "") rowErr.licenceExpiry = "Required.";
      if (Object.keys(rowErr).length > 0) {
        trErrs[row.key] = rowErr;
        continue;
      }
      specialties.push({
        trade: row.trade.trim(),
        contractorCalloutRate: callout,
        contractorStandardRate: standard,
        licenceNumber: row.licenceNumber.trim(),
        licenceExpiry: row.licenceExpiry,
        active: row.active,
      });
    }

    if (addressError) errs["address"] = addressError;

    if (Object.keys(errs).length > 0 || Object.keys(trErrs).length > 0) {
      return { ok: false, fieldErrors: errs, tradeErrors: trErrs };
    }

    return {
      ok: true,
      fieldErrors: {},
      tradeErrors: {},
      payload: {
        name: fields.name.trim(),
        email,
        phone: fields.phone.trim(),
        businessName: fields.businessName.trim() === "" ? null : fields.businessName.trim(),
        abn: fields.abn.trim() === "" ? null : fields.abn.trim(),
        gstRegistered: fields.gstRegistered,
        address: fields.address,
        emergencyContactName: fields.emergencyContactName.trim() === "" ? null : fields.emergencyContactName.trim(),
        emergencyContactPhone: fields.emergencyContactPhone.trim() === "" ? null : fields.emergencyContactPhone.trim(),
        specialties,
        insurer: fields.insurer.trim() === "" ? null : fields.insurer.trim(),
        insurancePolicyNo: fields.insurancePolicyNo.trim() === "" ? null : fields.insurancePolicyNo.trim(),
        insuranceExpiry: fields.insuranceExpiry.trim() === "" ? null : fields.insuranceExpiry,
        payoutBsb: fields.payoutBsb.trim() === "" ? null : fields.payoutBsb.trim(),
        payoutAccountNo: fields.payoutAccountNo.trim() === "" ? null : fields.payoutAccountNo.trim(),
        payoutAccountName: fields.payoutAccountName.trim() === "" ? null : fields.payoutAccountName.trim(),
        active: activeOverride ?? activeState,
      },
    };
  }

  async function runSave(activeOverride?: boolean): Promise<ContractorDto | null> {
    const validation = validate(activeOverride);
    setFieldErrors(validation.fieldErrors);
    setTradeErrors(validation.tradeErrors);
    if (!validation.ok) {
      setFormError("Fix the marked fields, then save.");
      window.scrollTo(0, 0);
      return null;
    }
    setFormError(undefined);
    setSaving(true);
    try {
      const res = await fetch(
        mode === "create" ? `${apiUrl}/api/contractors` : `${apiUrl}/api/contractors/${contractor?.code ?? ""}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.payload),
        },
      );
      const body = (await res.json()) as ContractorDto & ApiFieldError;
      if (!res.ok) {
        if (body.field) setFieldErrors((prev) => ({ ...prev, [body.field as string]: body.error }));
        else setFormError(body.error);
        window.scrollTo(0, 0);
        return null;
      }
      return body;
    } catch {
      setFormError("Save failed -- check your connection and try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const saved = await runSave();
    if (!saved) return;
    const toastText =
      mode === "create" ? `${saved.name} added. Welcome email sent to ${saved.email}.` : `${saved.name} saved.`;
    router.push(`/ops/contractors?toast=${encodeURIComponent(toastText)}`);
  }

  async function submitInPlace(nextActive: boolean, toastText: string) {
    const previous = activeState;
    setActiveState(nextActive);
    const saved = await runSave(nextActive);
    if (!saved) {
      setActiveState(previous);
      return;
    }
    setContractor(saved);
    setFields(fieldsFromDto(saved));
    setTrades(saved.specialties.map((s, i) => tradeRowFromDto(s, `row-${String(i)}`)));
    setActiveState(saved.status === "active");
    showToast(toastText);
  }

  function handleStatusToggle(nextChecked: boolean) {
    if (!contractor) return;
    if (!nextChecked) {
      setConfirmDeactivate(true);
      return;
    }
    void submitInPlace(true, `${contractor.name} reactivated.`);
  }

  function confirmDeactivateNow() {
    setConfirmDeactivate(false);
    if (!contractor) return;
    void submitInPlace(
      false,
      `${contractor.name} deactivated. Their session is gone and they are off every dispatch list.`,
    );
  }

  async function handleResend() {
    if (!contractor) return;
    setResending(true);
    try {
      await fetch(`${apiUrl}/api/contractors/${contractor.code}/resend-welcome`, {
        method: "POST",
        credentials: "include",
      });
      showToast(`Welcome email sent again to ${contractor.email}. The old link no longer works.`);
    } finally {
      setResending(false);
    }
  }

  const headTags: { kind: "active" | "suspended"; label: string }[] = contractor
    ? [{ kind: contractor.status === "active" ? "active" : "suspended", label: contractor.status === "active" ? "Active" : "Deactivated" }]
    : [];
  const readyTag = contractor
    ? { kind: (contractor.ready ? "ready" : "notready") as "ready" | "notready", label: contractor.ready ? "Ready to dispatch" : "Not ready to dispatch" }
    : null;

  return (
    <div>
      <div className="mb-1.5 max-w-[760px] text-xs text-muted-text">
        <Link href="/ops/contractors" className="text-muted-text">
          Contractors
        </Link>{" "}
        / <span>{contractor ? contractor.code : "New contractor"}</span>
      </div>
      <div className="mb-4.5 flex max-w-[760px] flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-0.5 font-heading text-xl font-black text-ink md:text-[22px]">
            {contractor ? `${contractor.code} ${contractor.name}` : "New contractor"}
          </h1>
          <p className="text-[13px] text-muted-text">
            {contractor ? `Added ${fmtDate(contractor.createdAt)}. Change anything and press Save.` : "Only name, email and phone are needed to save. The rest can arrive later."}
          </p>
        </div>
        {contractor ? (
          <div className="flex gap-1.5">
            {headTags.map((t) => (
              <span key={t.label} className={tagClasses(t.kind)}>
                {t.label}
              </span>
            ))}
            {readyTag ? (
              <span className={tagClasses(readyTag.kind)}>{readyTag.label}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {contractor ? (
        // Record tabs (frontend-conventions.md): a tab strip under the page
        // title, accent underline on the active tab, each tab its own page
        // and URL. Service area (2002) is a second tab that does not exist
        // yet -- "a tab whose surface cannot exist yet does not show" -- so
        // this carries only Details (plan.md Scope) until 2002 ships it.
        <div className="mb-4.5 flex max-w-[760px] gap-5 border-b border-hairline" role="tablist">
          <Link
            href={`/ops/contractors/${contractor.code}`}
            role="tab"
            aria-selected="true"
            className="border-b-2 border-brand-accent pb-2 text-sm font-bold text-ink"
          >
            Details
          </Link>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        noValidate
        className="flex max-w-[760px] flex-col gap-4"
      >
        {formError ? <Banner kind="error">{formError}</Banner> : null}

        {contractor ? (
          <div className={`rounded-lg p-3.5 text-[13px] ${contractor.ready ? "bg-success-bg text-brand-success" : "bg-warning-bg text-brand-warning"}`}>
            {contractor.ready ? (
              <b>{readyBannerText(contractor)}</b>
            ) : (
              <>
                <b>Not ready to dispatch.</b> Missing:
                <ul className="mt-0.5 mb-0 list-disc pl-4.5">
                  {contractor.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        <div className="rounded-[10px] border border-hairline bg-surface p-5">
          <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Contractor</h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" id="f-name" required value={fields.name} onChange={(e) => set("name", e.target.value)} error={fieldErrors["name"]} />
            <Field
              label="Email"
              id="f-email"
              required
              value={fields.email}
              onChange={(e) => set("email", e.target.value)}
              error={fieldErrors["email"]}
              helper={fieldErrors["email"] ? undefined : "The welcome email goes here."}
            />
            <Field
              label="Phone"
              id="f-phone"
              required
              placeholder="0412 345 678"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={fieldErrors["phone"]}
              helper={fieldErrors["phone"] ? undefined : "Dispatch SMS goes here."}
            />
          </div>
          <PlacesField
            id="f-address"
            label="Address"
            value={fields.address}
            onChange={(v) => set("address", v)}
            error={addressError ?? fieldErrors["address"]}
            onErrorChange={setAddressError}
            onPickingChange={setAddressPicking}
          />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              label="Emergency contact name"
              id="f-ecName"
              placeholder="Jen Reilly"
              value={fields.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
            />
            <Field
              label="Emergency contact phone"
              id="f-ecPhone"
              placeholder="0400 000 000"
              value={fields.emergencyContactPhone}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
            />
          </div>
        </div>

        {contractor ? (
          <div className="rounded-[10px] border border-hairline bg-surface p-5">
            <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Login</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Login email</span>
                <b className="text-ink">{contractor.email}</b>
              </div>
              <div>
                <span className="text-[13px] text-secondary-text">
                  {contractor.hasCredential && contractor.credentialSetAt
                    ? `Login setup completed: ${fmtDate(contractor.credentialSetAt)}`
                    : "Login setup: not yet completed"}
                </span>
              </div>
              {!contractor.hasCredential ? (
                <div>
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={resending}
                    className="text-[13px] font-semibold text-secondary-text underline underline-offset-2 disabled:opacity-50"
                  >
                    Resend welcome email
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-[10px] border border-hairline bg-surface p-5">
          <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">
            Trades <small className="text-xs font-normal text-muted-text">what we pay this contractor, per trade</small>
          </h3>
          <TradeRows
            rows={trades}
            onChange={setTrades}
            tradeOptions={tradeOptions}
            errors={tradeErrors}
            onRemoveRefused={() => showToast("A trade that has been used on a job cannot be removed -- suspend it instead.")}
          />
        </div>

        <div className="rounded-[10px] border border-hairline bg-surface p-5">
          <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">
            Insurance <small className="text-xs font-normal text-muted-text">one public-liability policy covering all trades</small>
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Insurer" id="f-insurer" placeholder="QBE" value={fields.insurer} onChange={(e) => set("insurer", e.target.value)} />
            <Field
              label="Policy number"
              id="f-policyNo"
              placeholder="PL-2291-884"
              value={fields.insurancePolicyNo}
              onChange={(e) => set("insurancePolicyNo", e.target.value)}
            />
            <Field
              label="Expiry"
              id="f-insExpiry"
              type="date"
              value={fields.insuranceExpiry}
              onChange={(e) => set("insuranceExpiry", e.target.value)}
              warning={
                fields.insuranceExpiry && !isFutureDate(fields.insuranceExpiry)
                  ? "Already expired -- cannot be dispatched until it is renewed."
                  : undefined
              }
              helper={fields.insuranceExpiry && !isFutureDate(fields.insuranceExpiry) ? undefined : "Must be in the future to dispatch."}
            />
          </div>
        </div>

        <div className="rounded-[10px] border border-hairline bg-surface p-5">
          <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">
            Payout <small className="text-xs font-normal text-muted-text">weekly bank transfer</small>
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Business name"
              id="f-businessName"
              placeholder="Reilly Plumbing"
              value={fields.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              error={fieldErrors["businessName"]}
              helper={fieldErrors["businessName"] ? undefined : "The name registered against the ABN. A sole trader: their own name."}
            />
            <Field
              label="ABN"
              id="f-abn"
              placeholder="51 824 753 556"
              value={fields.abn}
              onChange={(e) => set("abn", e.target.value)}
              error={fieldErrors["abn"]}
              helper={fieldErrors["abn"] ? undefined : "11 digits."}
            />
            <div>
              <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">GST registered</span>
              <label className="flex items-center gap-2.5">
                <ToggleSwitch checked={fields.gstRegistered} onChange={(v) => set("gstRegistered", v)} label="GST registered" />
                <span className="font-semibold text-ink">{fields.gstRegistered ? "Yes" : "No"}</span>
              </label>
              <p className="mt-[5px] text-xs text-muted-text">Drives GST on their payouts.</p>
            </div>
            <Field
              label="BSB"
              id="f-bsb"
              placeholder="066-000"
              value={fields.payoutBsb}
              onChange={(e) => set("payoutBsb", e.target.value)}
              error={fieldErrors["payoutBsb"]}
            />
            <Field
              label="Account number"
              id="f-accountNo"
              placeholder="12345678"
              value={fields.payoutAccountNo}
              onChange={(e) => set("payoutAccountNo", e.target.value)}
            />
            <Field
              label="Account name"
              id="f-accountName"
              placeholder="B Reilly"
              value={fields.payoutAccountName}
              onChange={(e) => set("payoutAccountName", e.target.value)}
            />
          </div>
        </div>

        {contractor ? (
          <div className="rounded-[10px] border border-hairline bg-surface p-5">
            <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Contractor status</h3>
            <label className="flex items-center gap-2.5">
              <ToggleSwitch checked={activeState} onChange={handleStatusToggle} label="Contractor status" />
              <span className="font-semibold text-ink">
                {activeState ? "Active -- dispatched when ready" : "Deactivated -- no dispatch, no login"}
              </span>
            </label>
            <p className="mt-1.5 text-xs text-muted-text">
              {activeState !== (contractor.status === "active")
                ? "Not saved yet"
                : contractor.statusChangedAt
                  ? `${contractor.status === "active" ? "Reactivated" : "Deactivated"} ${fmtDate(contractor.statusChangedAt)}${
                      contractor.statusChangedByName ? ` by ${contractor.statusChangedByName}` : ""
                    }`
                  : `Active since ${fmtDate(contractor.createdAt)}`}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/ops/contractors")}
            className="min-h-11 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || addressPicking}
            className={`min-h-11 min-w-[140px] rounded-md px-5 py-2.5 text-sm font-bold text-on-accent ${
              saving || addressPicking ? "bg-brand-accent-loading" : "bg-brand-accent"
            }`}
          >
            {saving ? "Saving..." : addressPicking ? "Picking address..." : "Save"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeactivate}
        title={`Deactivate ${contractor?.name ?? ""}?`}
        confirmLabel="Deactivate"
        cancelLabel="Keep active"
        severity="destructive"
        onConfirm={confirmDeactivateNow}
        onCancel={() => setConfirmDeactivate(false)}
      >
        They drop out of every dispatch list and their login stops working straight away. Jobs already on their
        calendar stay as they are. You can reactivate them any time.
      </ConfirmDialog>

      <Toast message={toastMessage} />
    </div>
  );
}
