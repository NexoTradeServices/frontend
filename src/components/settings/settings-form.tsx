// The settings form -- Feature 1006, admin settings screen.
//
// One column of cards, one topic per card, ONE Save for the whole screen
// (Patterns / Portal form screens). The GST switch is the one field with
// teeth: the ABN gate is mirrored here so a doomed save never round-trips
// (the server enforces it for real -- AC4), and a flip in either direction
// is held behind the standard-severity confirm dialog before it ships
// (AC5). Every other field just rides the one Save. Confirmed live on the
// Ops Portal Shell style reference, 01 Sep 2026.
"use client";

import { useState } from "react";
import { Field } from "@/components/auth/field";
import { SelectField } from "@/components/ui/select-field";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PrimaryButton } from "@/components/auth/buttons";
import { Banner } from "@/components/auth/banner";

export interface SettingsDto {
  id: string;
  displayName: string;
  gstRegistered: boolean;
  gstStatusChangedAt: string | null;
  gstStatusChangedByUserId: string | null;
  gstStatusChangedBy: { id: string; name: string } | null;
  businessAbn: string | null;
  gstRatePercent: string;
  paymentTermsDays: number;
  serviceReachKm: number;
  calloutFee: number;
  returnVisitMinimumMinutes: number;
  maxContractorPartAmount: number;
  operatorPhone: string;
  operatorEmail: string;
  timezone: string;
  payoutCycle: "weekly" | "fortnightly";
  payoutDay: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" | null;
  emailProvider: string;
  smsProvider: string;
}

const TIMEZONE_OPTIONS = [
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide (ACST/ACDT)" },
  { value: "Australia/Hobart", label: "Australia/Hobart (AEST/AEDT)" },
  { value: "Australia/Darwin", label: "Australia/Darwin (ACST)" },
] as const;

const PAYOUT_CYCLE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
] as const;

const PAYOUT_DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
] as const;

// The console adapter is the dev fallback, never chosen by name (registry.ts) --
// these are the only provider names an owner ever picks from this screen.
const EMAIL_PROVIDER_OPTIONS = [{ value: "mailjet", label: "Mailjet" }] as const;
const SMS_PROVIDER_OPTIONS = [{ value: "clicksend", label: "ClickSend" }] as const;

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const DISPLAY_NAME_MAX_LENGTH = 80;

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsInputToCents(value: string): number | null {
  const dollars = Number(value);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
}

function formatAuditDate(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function SettingsForm({ initial }: { initial: SettingsDto }) {
  const [settings, setSettings] = useState(initial);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [gstRegistered, setGstRegistered] = useState(initial.gstRegistered);
  const [businessAbn, setBusinessAbn] = useState(initial.businessAbn ?? "");
  const [gstRatePercent, setGstRatePercent] = useState(initial.gstRatePercent);
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(initial.paymentTermsDays));
  const [serviceReachKm, setServiceReachKm] = useState(String(initial.serviceReachKm));
  const [calloutFee, setCalloutFee] = useState(centsToDollarsInput(initial.calloutFee));
  const [returnVisitMinimumMinutes, setReturnVisitMinimumMinutes] = useState(
    String(initial.returnVisitMinimumMinutes),
  );
  const [maxContractorPartAmount, setMaxContractorPartAmount] = useState(
    centsToDollarsInput(initial.maxContractorPartAmount),
  );
  const [operatorPhone, setOperatorPhone] = useState(initial.operatorPhone);
  const [operatorEmail, setOperatorEmail] = useState(initial.operatorEmail);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [payoutCycle, setPayoutCycle] = useState(initial.payoutCycle);
  const [payoutDay, setPayoutDay] = useState(initial.payoutDay ?? "fri");
  const [emailProvider, setEmailProvider] = useState(initial.emailProvider);
  const [smsProvider, setSmsProvider] = useState(initial.smsProvider);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  function buildPayload(): Record<string, unknown> | undefined {
    const calloutFeeCents = dollarsInputToCents(calloutFee);
    const maxPartCents = dollarsInputToCents(maxContractorPartAmount);
    if (calloutFeeCents === null || maxPartCents === null) {
      setFormError("Check the money fields -- they must be plain numbers.");
      return undefined;
    }
    return {
      displayName,
      gstRegistered,
      businessAbn: businessAbn.trim() === "" ? null : businessAbn.trim(),
      gstRatePercent: Number(gstRatePercent),
      paymentTermsDays: Number(paymentTermsDays),
      serviceReachKm: Number(serviceReachKm),
      calloutFee: calloutFeeCents,
      returnVisitMinimumMinutes: Number(returnVisitMinimumMinutes),
      maxContractorPartAmount: maxPartCents,
      operatorPhone,
      operatorEmail,
      timezone,
      payoutCycle,
      payoutDay,
      emailProvider,
      smsProvider,
    };
  }

  async function doSave(payload: Record<string, unknown>) {
    setSaving(true);
    setFormError(undefined);
    setSaved(false);
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as SettingsDto & { error?: string; field?: string };
      if (!res.ok) {
        if (body.field) {
          setFieldErrors({ [body.field]: body.error ?? "That value was refused." });
        } else {
          setFormError(body.error ?? "Save failed.");
        }
        return;
      }
      setSettings(body);
      setGstRegistered(body.gstRegistered);
      setSaved(true);
    } catch {
      setFormError("Save failed -- check your connection and try again.");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
      setPendingPayload(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(undefined);

    // Decision 7, mirrored client-side (the server enforces it for real).
    if (displayName.trim() === "") {
      setFieldErrors({ displayName: "Enter a business name." });
      return;
    }
    if (displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
      setFieldErrors({ displayName: `Keep it to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.` });
      return;
    }

    // The ABN gate, mirrored client-side (the server enforces it for real -- AC4).
    if (gstRegistered && businessAbn.trim() === "") {
      setFieldErrors({ businessAbn: "Enter the ABN first - a GST-registered invoice must carry it." });
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    if (gstRegistered !== settings.gstRegistered) {
      setPendingPayload(payload);
      setConfirmOpen(true);
      return;
    }
    void doSave(payload);
  }

  function cancelGstFlip() {
    setGstRegistered(settings.gstRegistered);
    setConfirmOpen(false);
    setPendingPayload(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError ? <Banner kind="error">{formError}</Banner> : null}
      {saved ? <Banner kind="success">Saved.</Banner> : null}

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Business</h3>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="displayName"
              label="Business name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={fieldErrors["displayName"]}
              helper={fieldErrors["displayName"] ? undefined : "Shown on every screen and signs every message."}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="businessAbn"
              label="ABN"
              optional
              value={businessAbn}
              onChange={(e) => setBusinessAbn(e.target.value)}
              error={fieldErrors["businessAbn"]}
              helper={fieldErrors["businessAbn"] ? undefined : "Required before GST can be switched on."}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="operatorPhone"
              label="Operator phone"
              value={operatorPhone}
              onChange={(e) => setOperatorPhone(e.target.value)}
              error={fieldErrors["operatorPhone"]}
              helper={fieldErrors["operatorPhone"] ? undefined : "The single number customers ring."}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="operatorEmail"
              label="Business inbox"
              type="email"
              value={operatorEmail}
              onChange={(e) => setOperatorEmail(e.target.value)}
              error={fieldErrors["operatorEmail"]}
              helper={
                fieldErrors["operatorEmail"]
                  ? undefined
                  : "Every notice the platform sends the business lands here."
              }
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <SelectField
              id="timezone"
              label="Timezone"
              options={TIMEZONE_OPTIONS}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              error={fieldErrors["timezone"]}
              helper={
                fieldErrors["timezone"] ? undefined : 'The business clock: payout weeks, daily sweeps, "today".'
              }
            />
          </div>
        </div>
      </div>

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">GST</h3>
        <div className="flex items-start gap-3">
          <ToggleSwitch
            id="gstRegistered"
            label="GST registered"
            checked={gstRegistered}
            onChange={setGstRegistered}
          />
          <div>
            <b className="block text-sm font-semibold text-ink">GST registered</b>
            <span className="text-xs text-muted-text">
              Off: invoices show a total only. On: the same total, with the GST inside it disclosed.
              Customer prices never change.
            </span>
            {settings.gstStatusChangedAt && settings.gstStatusChangedBy ? (
              <p className="mt-1.5 text-xs text-muted-text">
                Changed {formatAuditDate(settings.gstStatusChangedAt)} by {settings.gstStatusChangedBy.name}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="gstRatePercent"
              label="GST rate"
              type="number"
              step="0.01"
              min={0}
              max={100}
              suffix="%"
              value={gstRatePercent}
              onChange={(e) => setGstRatePercent(e.target.value)}
              error={fieldErrors["gstRatePercent"]}
              helper={
                fieldErrors["gstRatePercent"]
                  ? undefined
                  : "Drives the disclosed portion; the value is computed, never typed on an invoice."
              }
            />
          </div>
        </div>
      </div>

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Charges &amp; rules</h3>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="paymentTermsDays"
              label="Payment terms"
              type="number"
              min={0}
              suffix="days"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(e.target.value)}
              error={fieldErrors["paymentTermsDays"]}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="calloutFee"
              label="No-show call-out fee"
              type="number"
              step="0.01"
              min={0}
              prefix="$"
              value={calloutFee}
              onChange={(e) => setCalloutFee(e.target.value)}
              error={fieldErrors["calloutFee"]}
              helper={fieldErrors["calloutFee"] ? undefined : "Passed to the contractor in full."}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="returnVisitMinimumMinutes"
              label="Return visit minimum"
              type="number"
              min={0}
              suffix="min"
              value={returnVisitMinimumMinutes}
              onChange={(e) => setReturnVisitMinimumMinutes(e.target.value)}
              error={fieldErrors["returnVisitMinimumMinutes"]}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="maxContractorPartAmount"
              label="Contractor part cap"
              type="number"
              step="0.01"
              min={0}
              prefix="$"
              value={maxContractorPartAmount}
              onChange={(e) => setMaxContractorPartAmount(e.target.value)}
              error={fieldErrors["maxContractorPartAmount"]}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="serviceReachKm"
              label="Service reach"
              type="number"
              step="0.1"
              min={0}
              suffix="km"
              value={serviceReachKm}
              onChange={(e) => setServiceReachKm(e.target.value)}
              error={fieldErrors["serviceReachKm"]}
            />
          </div>
        </div>
      </div>

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Payouts &amp; providers</h3>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <SelectField
              id="payoutCycle"
              label="Payout cycle"
              options={PAYOUT_CYCLE_OPTIONS}
              value={payoutCycle}
              onChange={(e) => setPayoutCycle(e.target.value as "weekly" | "fortnightly")}
              error={fieldErrors["payoutCycle"]}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <SelectField
              id="payoutDay"
              label="Payout day"
              options={PAYOUT_DAY_OPTIONS}
              value={payoutDay}
              onChange={(e) => setPayoutDay(e.target.value as typeof payoutDay)}
              error={fieldErrors["payoutDay"]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <SelectField
              id="emailProvider"
              label="Email provider"
              options={EMAIL_PROVIDER_OPTIONS}
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
              error={fieldErrors["emailProvider"]}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <SelectField
              id="smsProvider"
              label="SMS provider"
              options={SMS_PROVIDER_OPTIONS}
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value)}
              error={fieldErrors["smsProvider"]}
            />
          </div>
        </div>
      </div>

      <div className="flex max-w-[720px] justify-end">
        <PrimaryButton
          loading={saving}
          loadingLabel="Saving..."
          className="mt-0 w-full sm:w-auto sm:min-w-[180px]"
        >
          Save settings
        </PrimaryButton>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={gstRegistered ? "Switch GST on?" : "Switch GST off?"}
        confirmLabel={gstRegistered ? "Switch on" : "Switch off"}
        loading={saving}
        onConfirm={() => pendingPayload && void doSave(pendingPayload)}
        onCancel={cancelGstFlip}
      >
        {gstRegistered ? (
          <p>
            From your next saved invoice, every invoice discloses the GST inside its total and carries ABN{" "}
            {businessAbn}. Customer prices do not change. This change is recorded with your name and today&apos;s
            date.
          </p>
        ) : (
          <p>
            From your next saved invoice, invoices show a total only, with no GST disclosed. This change is
            recorded with your name and today&apos;s date.
          </p>
        )}
      </ConfirmDialog>
    </form>
  );
}
