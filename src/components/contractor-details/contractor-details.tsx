// The contractor's My details page -- Feature 2005. Portal, Medium, Form page.
//
// Three form cards the contractor looks after (Address, Emergency contact, Bank details) with ONE Save row, and a
// card "Set by the office" whose values are frozen (Molecules / Field, Frozen state). The address is for the file
// only, so it carries no state check here (unlike Mike's form). Saved shows a Toast "Saved".
"use client";

import { useState } from "react";
import { Field } from "@/components/auth/field";
import { Banner } from "@/components/auth/banner";
import { PlacesField, type PickedAddress } from "@/components/ui/places-field";
import { LockedField } from "@/components/ui/locked-field";
import { Toast, useToast } from "@/components/ui/toast";
import { fmtDate } from "@/components/contractors/types";
import type { DetailsDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const card = "mb-3 rounded-card border border-hairline bg-surface p-4 sm:p-5";
const cardTitle = "mb-3.5 font-heading text-base font-extrabold text-ink";

interface Fields {
  address: PickedAddress | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  payoutBsb: string;
  payoutAccountNo: string;
  payoutAccountName: string;
}

function fieldsOf(dto: DetailsDto): Fields {
  return {
    address: dto.own.address,
    emergencyContactName: dto.own.emergencyContactName ?? "",
    emergencyContactPhone: dto.own.emergencyContactPhone ?? "",
    payoutBsb: dto.own.payoutBsb ?? "",
    payoutAccountNo: dto.own.payoutAccountNo ?? "",
    payoutAccountName: dto.own.payoutAccountName ?? "",
  };
}

const orNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export function ContractorDetails({ initial }: { initial: DetailsDto }) {
  const [office] = useState(initial.office);
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [addressError, setAddressError] = useState<string | undefined>();
  const [addressPicking, setAddressPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, showToast] = useToast();

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((prev) => ({ ...prev, [key]: value }));

  async function save() {
    const next: Record<string, string> = {};
    if (fields.payoutBsb.trim() !== "" && !/^\d{6}$/.test(fields.payoutBsb.replace(/[\s-]/g, ""))) next["payoutBsb"] = "A BSB is six digits.";
    if (addressError) next["address"] = addressError;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError("Fix the marked fields, then save.");
      return;
    }
    setFormError(undefined);
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/contractor/details`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fields.address,
          emergencyContactName: orNull(fields.emergencyContactName),
          emergencyContactPhone: orNull(fields.emergencyContactPhone),
          payoutBsb: orNull(fields.payoutBsb),
          payoutAccountNo: orNull(fields.payoutAccountNo),
          payoutAccountName: orNull(fields.payoutAccountName),
        }),
      });
      const body = (await res.json()) as DetailsDto & { error?: string; field?: string };
      if (!res.ok) {
        if (body.field) setErrors({ [body.field]: body.error ?? "Check this." });
        else setFormError(body.error ?? "Save failed -- try again.");
        return;
      }
      setFields(fieldsOf(body));
      showToast("Saved");
    } catch {
      setFormError("Save failed -- check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const gst = office.gstRegistered === null ? "Not asked yet" : office.gstRegistered ? "Yes" : "No";

  return (
    <div>
      {formError ? <Banner kind="error">{formError}</Banner> : null}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className={card}>
          <h3 className={cardTitle}>Address</h3>
          <PlacesField
            id="d-address"
            label="Address"
            value={fields.address}
            onChange={(v) => set("address", v)}
            error={errors["address"] ?? addressError}
            onErrorChange={setAddressError}
            onPickingChange={setAddressPicking}
          />
        </div>

        <div className={card}>
          <h3 className={cardTitle}>Emergency contact</h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Name" id="d-ecName" placeholder="Jen Reilly" value={fields.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
            <Field label="Phone" id="d-ecPhone" placeholder="0400 000 000" value={fields.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
          </div>
        </div>

        <div className={card}>
          <h3 className={cardTitle}>
            Bank details <small className="text-xs font-normal text-muted-text">where your weekly payout goes</small>
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="BSB" id="d-bsb" placeholder="066-000" value={fields.payoutBsb} onChange={(e) => set("payoutBsb", e.target.value)} error={errors["payoutBsb"]} />
            <Field label="Account number" id="d-accountNo" placeholder="12345678" value={fields.payoutAccountNo} onChange={(e) => set("payoutAccountNo", e.target.value)} />
            <Field label="Account name" id="d-accountName" placeholder="B Reilly" value={fields.payoutAccountName} onChange={(e) => set("payoutAccountName", e.target.value)} />
          </div>
        </div>

        <div className="mb-3 flex justify-end">
          <button
            type="submit"
            disabled={saving || addressPicking}
            className={`min-h-11 min-w-[140px] rounded-button px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed ${
              saving || addressPicking ? "bg-brand-accent-loading text-on-accent" : "bg-brand-accent text-on-accent"
            }`}
          >
            {saving ? "Saving..." : addressPicking ? "Picking address..." : "Save"}
          </button>
        </div>
      </form>

      <div className={card} data-testid="office-card">
        <h3 className={cardTitle}>
          Set by the office <small className="text-xs font-normal text-muted-text">Ring the office to change any of these.</small>
        </h3>
        <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <LockedField label="Name" value={office.name} />
          <LockedField label="Contractor code" value={office.code} />
          <LockedField label="Email" value={office.email} />
          <LockedField label="Phone" value={office.phone} />
          <LockedField label="Business name" value={office.businessName ?? "Not set"} />
          <LockedField label="ABN" value={office.abn ?? "Not set"} />
          <LockedField label="GST registered" value={gst} />
          <LockedField label="Operating state" value={office.operatingState} />
          {office.specialties.map((s) => (
            <LockedField key={s.trade} label={s.trade} value={`Licence ${s.licenceNumber}, expires ${fmtDate(s.licenceExpiry)}`} />
          ))}
          <LockedField
            label="Insurance"
            value={
              office.insurer
                ? `${office.insurer}${office.insurancePolicyNo ? `, policy ${office.insurancePolicyNo}` : ""}${office.insuranceExpiry ? `, expires ${fmtDate(office.insuranceExpiry)}` : ""}`
                : "Not set"
            }
          />
          <LockedField label="Status" value={office.status === "active" ? "Active" : "Deactivated"} />
        </div>
      </div>

      <Toast message={toastMessage} />
    </div>
  );
}
