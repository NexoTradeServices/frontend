// The Contractors list -- Feature 2001, contractor onboarding (Mike's path),
// plan decision 12. Card anatomy (frontend-conventions.md): reference code +
// status tag on top, name, key facts below. Confirmed on the Contractor
// onboarding flow walkthrough, 03 Sep 2026.
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PrimaryLink } from "@/components/auth/buttons";
import { Toast, useToast } from "@/components/ui/toast";
import { dispatchState, fmtDate, type ContractorDto } from "./types";

// The list row's three fixed lines -- design: Managing the contractor
// record, "The list row" (settled 04/09/26, 2001 change.md Q1). Always in
// this order, so Mike decides from the list without opening the record;
// they never merge, even on a phone.

/** Line 1: what they do -- a trade that cannot be dispatched carries its reason in brackets. */
function tradesLine(contractor: ContractorDto): string {
  if (contractor.specialties.length === 0) return "no trades";
  return contractor.specialties
    .map((s) => {
      const state = dispatchState(s.status === "active", s.licenceExpiry);
      if (state === "dispatchable") return s.trade;
      return `${s.trade} (${state === "expired" ? "licence expired" : "suspended"})`;
    })
    .join(" - ");
}

/** Line 2: cover and where -- each half independently its fact or its "No ..." fallback. */
function coverLine(contractor: ContractorDto): string {
  const insurancePart = contractor.insuranceExpiry ? `Insured to ${fmtDate(contractor.insuranceExpiry)}` : "No insurance";
  const areaPart =
    contractor.servedPostcodeCount > 0
      ? `${String(contractor.servedPostcodeCount)} postcodes from ${contractor.coreLocationSuburb ?? "?"}`
      : "No service area yet";
  return `${insurancePart} - ${areaPart}`;
}

export function ContractorList({ contractors }: { contractors: ContractorDto[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toastMessage, showToast] = useToast();

  useEffect(() => {
    const toast = searchParams.get("toast");
    if (toast) {
      showToast(toast);
      router.replace("/ops/contractors");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="max-w-[760px]">
      <div className="mb-4.5 flex justify-end">
        <PrimaryLink href="/ops/contractors/new" size="compact">
          Add a contractor
        </PrimaryLink>
      </div>

      {contractors.length === 0 ? (
        <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-muted-text">
          No contractors yet. Add one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contractors.map((contractor) => (
            <Link
              key={contractor.code}
              href={`/ops/contractors/${contractor.code}`}
              className="block rounded-[10px] border border-hairline bg-surface p-4"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-heading text-[13px] font-extrabold text-ink">{contractor.code}</span>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase ${
                    contractor.status === "active" ? "bg-success-bg text-brand-success" : "bg-ground text-muted-text"
                  }`}
                >
                  {contractor.status === "active" ? "Active" : "Deactivated"}
                </span>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase ${
                    contractor.ready ? "bg-success-bg text-brand-success" : "bg-warning-bg text-brand-warning"
                  }`}
                >
                  {contractor.ready ? "Ready to dispatch" : "Not ready to dispatch"}
                </span>
              </div>
              <div className="mb-0.5 font-heading text-[15px] font-extrabold text-ink">{contractor.name}</div>
              <div className="text-xs text-muted-text">
                <div>{tradesLine(contractor)}</div>
                <div>{coverLine(contractor)}</div>
                {!contractor.ready && contractor.missing.length > 0 ? (
                  <div className="text-brand-warning">Missing: {contractor.missing.join(", ")}</div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Toast message={toastMessage} />
    </div>
  );
}
