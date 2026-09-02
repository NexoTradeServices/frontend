// The per-trade pricing form -- Feature 1007, ServiceType catalog screen.
//
// Portal form screens (frontend-conventions.md): one column of cards, one
// topic per card, ONE Save for the whole screen. The normal multiplier is
// the locked/frozen field (plan decision 1); emergency and weekend each
// carry a live computed preview beside them (plan decision 2 -- display
// only, nothing computed is ever stored); the prefilled enquiry options are
// repeatable rows (plan AC5). Confirmed against the Ops Portal Shell style
// reference and the frozen repeatable-rows / computed-preview patterns
// (plan.md, Quick fixes).
//
// Feature 1012: the prefilled options are the first user of the ordered
// repeatable-rows variant (up/down buttons, no drag) -- reordering is
// client-side row shuffling; nothing saves until this screen's one Save.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/field";
import { LockedField } from "@/components/ui/locked-field";
import { RepeatableRows } from "@/components/ui/repeatable-rows";
import { PrimaryButton } from "@/components/auth/buttons";
import { Banner } from "@/components/auth/banner";

export interface ServiceTypeDto {
  id: string;
  trade: string;
  customerCalloutRate: number;
  customerStandardRate: number;
  serviceLevelMultipliers: { normal: number; emergency: number; weekend: number };
  prefilledFields: string[];
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsInputToCents(value: string): number | null {
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

/** Base cents x multiplier, rounded to the cent -- display only, nothing here is ever stored (plan decision 2). */
function previewDollars(rateDollars: string, multiplier: string): string | null {
  const rate = Number(rateDollars);
  const factor = Number(multiplier);
  if (!Number.isFinite(rate) || !Number.isFinite(factor)) return null;
  return ((Math.round(rate * 100) * factor) / 100).toFixed(2);
}

export function ServiceTypeForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: ServiceTypeDto;
}) {
  const router = useRouter();

  const [trade, setTrade] = useState(initial.trade);
  const [customerCalloutRate, setCustomerCalloutRate] = useState(centsToDollarsInput(initial.customerCalloutRate));
  const [customerStandardRate, setCustomerStandardRate] = useState(centsToDollarsInput(initial.customerStandardRate));
  const [emergency, setEmergency] = useState(String(initial.serviceLevelMultipliers.emergency));
  const [weekend, setWeekend] = useState(String(initial.serviceLevelMultipliers.weekend));
  const [prefilledFields, setPrefilledFields] = useState<string[]>(initial.prefilledFields);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(undefined);
    setSaved(false);

    if (mode === "create" && trade.trim() === "") {
      setFieldErrors({ trade: "Name the trade before adding it." });
      return;
    }

    const calloutCents = dollarsInputToCents(customerCalloutRate);
    const standardCents = dollarsInputToCents(customerStandardRate);
    if (calloutCents === null || standardCents === null) {
      setFormError("Check the rate fields -- they must be plain numbers greater than zero.");
      return;
    }

    const emergencyValue = Number(emergency);
    const weekendValue = Number(weekend);
    if (!Number.isFinite(emergencyValue) || emergencyValue < 1) {
      setFieldErrors({ emergency: "The emergency multiplier must be 1.0 or higher." });
      return;
    }
    if (!Number.isFinite(weekendValue) || weekendValue < 1) {
      setFieldErrors({ weekend: "The weekend multiplier must be 1.0 or higher." });
      return;
    }

    const cleanedOptions = prefilledFields.map((v) => v.trim()).filter((v) => v.length > 0);

    const payload = {
      ...(mode === "create" ? { trade: trade.trim() } : {}),
      customerCalloutRate: calloutCents,
      customerStandardRate: standardCents,
      serviceLevelMultipliers: { normal: 1.0, emergency: emergencyValue, weekend: weekendValue },
      prefilledFields: cleanedOptions,
    };

    setSaving(true);
    try {
      const res = await fetch(
        mode === "create" ? `${apiUrl}/api/service-types` : `${apiUrl}/api/service-types/${initial.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as ServiceTypeDto & { error?: string; field?: string };
      if (!res.ok) {
        if (body.field) {
          setFieldErrors({ [body.field]: body.error ?? "That value was refused." });
        } else {
          setFormError(body.error ?? "Save failed.");
        }
        return;
      }
      if (mode === "create") {
        router.push("/ops/pricing");
        return;
      }
      setPrefilledFields(body.prefilledFields);
      setSaved(true);
    } catch {
      setFormError("Save failed -- check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const calloutEmergencyPreview = previewDollars(customerCalloutRate, emergency);
  const standardEmergencyPreview = previewDollars(customerStandardRate, emergency);
  const calloutWeekendPreview = previewDollars(customerCalloutRate, weekend);
  const standardWeekendPreview = previewDollars(customerStandardRate, weekend);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      {formError ? <Banner kind="error">{formError}</Banner> : null}
      {saved ? <Banner kind="success">Saved.</Banner> : null}

      {mode === "create" ? (
        <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
          <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Trade</h3>
          <Field
            id="trade"
            label="Trade name"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            error={fieldErrors["trade"]}
            helper={fieldErrors["trade"] ? undefined : "Shown to customers on the enquiry form. Must be unique."}
          />
        </div>
      ) : null}

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Customer rates</h3>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="customerCalloutRate"
              label="Call-out (first hour)"
              type="number"
              step="0.01"
              min={0}
              prefix="$"
              value={customerCalloutRate}
              onChange={(e) => setCustomerCalloutRate(e.target.value)}
              error={fieldErrors["customerCalloutRate"]}
              helper={
                fieldErrors["customerCalloutRate"] ? undefined : "Covers the call-out, travel and first hour -- charged once per job."
              }
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="customerStandardRate"
              label="Standard rate"
              type="number"
              step="0.01"
              min={0}
              prefix="$"
              suffix="/h"
              value={customerStandardRate}
              onChange={(e) => setCustomerStandardRate(e.target.value)}
              error={fieldErrors["customerStandardRate"]}
              helper={fieldErrors["customerStandardRate"] ? undefined : "Every hour after the first, in 15-minute blocks."}
            />
          </div>
        </div>
      </div>

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Service-level multipliers</h3>

        <LockedField
          label="Normal"
          value="1.0x"
          helper="The base rates above ARE the normal price -- locked so the price shown is always the price billed."
        />

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <Field
              id="emergency"
              label="Emergency"
              type="number"
              step="0.01"
              min={1}
              suffix="x"
              value={emergency}
              onChange={(e) => setEmergency(e.target.value)}
              error={fieldErrors["emergency"]}
            />
            {calloutEmergencyPreview && standardEmergencyPreview ? (
              <p className="mt-[-8px] mb-3.5 text-xs text-muted-text italic">
                Preview: call-out ${calloutEmergencyPreview} / hourly ${standardEmergencyPreview}
              </p>
            ) : null}
          </div>
          <div className="min-w-[200px] flex-1">
            <Field
              id="weekend"
              label="Weekend"
              type="number"
              step="0.01"
              min={1}
              suffix="x"
              value={weekend}
              onChange={(e) => setWeekend(e.target.value)}
              error={fieldErrors["weekend"]}
            />
            {calloutWeekendPreview && standardWeekendPreview ? (
              <p className="mt-[-8px] mb-3.5 text-xs text-muted-text italic">
                Preview: call-out ${calloutWeekendPreview} / hourly ${standardWeekendPreview}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-5">
        <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Prefilled enquiry options</h3>
        <RepeatableRows
          label="Option"
          helper="Shown to the customer on the enquiry form for this trade, in this order."
          values={prefilledFields}
          onChange={setPrefilledFields}
          placeholder="e.g. Blocked drain"
          ordered
        />
      </div>

      <div className="flex max-w-[720px] justify-end">
        <PrimaryButton loading={saving} loadingLabel="Saving..." className="mt-0 w-full sm:w-auto sm:min-w-[180px]">
          {mode === "create" ? "Add trade" : "Save"}
        </PrimaryButton>
      </div>
    </form>
  );
}
