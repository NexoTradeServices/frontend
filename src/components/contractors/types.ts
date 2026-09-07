// Shared shapes -- Feature 2001, contractor onboarding (Mike's path).
// Mirrors the backend's DTO (backend/src/contractors/routes.ts, toDto()).
import type { PickedAddress } from "@/components/ui/places-field";

export interface ContractorSpecialtyDto {
  trade: string;
  contractorCalloutRate: number;
  contractorStandardRate: number;
  licenceNumber: string;
  licenceExpiry: string; // yyyy-mm-dd
  status: "active" | "suspended";
  statusChangedAt: string | null;
  statusChangedByName: string | null;
}

export interface ContractorDto {
  code: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  abn: string | null;
  gstRegistered: boolean;
  address: PickedAddress | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insurer: string | null;
  insurancePolicyNo: string | null;
  insuranceExpiry: string | null; // yyyy-mm-dd
  payoutBsb: string | null;
  payoutAccountNo: string | null;
  payoutAccountName: string | null;
  status: "active" | "suspended";
  statusChangedAt: string | null;
  statusChangedByName: string | null;
  createdAt: string;
  specialties: ContractorSpecialtyDto[];
  servedPostcodeCount: number;
  /** the service area pin's suburb (empty until 2002 saves one) -- list row Line 2. */
  coreLocationSuburb: string | null;
  ready: boolean;
  missing: string[];
  hasCredential: boolean;
  credentialSetAt: string | null;
  lastInviteSentAt: string | null;
}

export interface ApiFieldError {
  error: string;
  field?: string;
}

/** ISO datetime or yyyy-mm-dd -> dd/mm/yy, matching the walkthrough's TODAY format. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

/** true when a yyyy-mm-dd date string is strictly in the future. */
export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() > now.getTime();
}

// Per-trade readiness -- design: Managing the contractor record, "Ready is
// contractor-level; each trade shows its own state" (settled 04/09/26,
// 2001 change.md Q1). The contractor-level Ready to dispatch tag stays
// server-computed (decision 3); a trade's own state is plain client-derived
// fact (status + licence expiry), same as the record's existing licence
// warning and the list's old trade summary.
export type DispatchState = "dispatchable" | "expired" | "suspended";

export function dispatchState(active: boolean, licenceExpiry: string): DispatchState {
  if (!active) return "suspended";
  if (!isFutureDate(licenceExpiry)) return "expired";
  return "dispatchable";
}

export function dispatchStateLabel(state: DispatchState): string {
  if (state === "suspended") return "Suspended";
  if (state === "expired") return "Licence expired";
  return "Dispatchable";
}

/** the record header's own tags (Active/Deactivated, Ready/Not ready) -- shared by the Details and Service area tabs. */
export function recordTagClasses(kind: "active" | "suspended" | "ready" | "notready"): string {
  const base = "inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase";
  if (kind === "active" || kind === "ready") return `${base} bg-success-bg text-brand-success`;
  if (kind === "notready") return `${base} bg-warning-bg text-brand-warning`;
  return `${base} bg-ground text-muted-text`;
}

/** the frozen tag style (Q1 visual) -- success/warning/neutral pill, shared across the contractor screens. */
export function dispatchStateTagClasses(state: DispatchState): string {
  // font-sans, explicit: every other status pill on this screen sits outside
  // the heading font's ancestry, but this one nests inside the trade row's
  // Archivo title -- inheriting it triggers a Chromium kerning glitch at
  // this weight/size ("DISPATCHABLE" renders with a visible gap after the
  // T). Pills are body-font everywhere else; pin it instead of relying on
  // where the tag happens to sit.
  const base =
    "inline-block shrink-0 whitespace-nowrap rounded px-2 py-0.5 font-sans text-[11px] font-bold tracking-[0.04em] uppercase";
  if (state === "dispatchable") return `${base} bg-success-bg text-brand-success`;
  if (state === "expired") return `${base} bg-warning-bg text-brand-warning`;
  return `${base} bg-ground text-muted-text`;
}
