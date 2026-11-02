// Shared shapes -- Feature 4002, dispatch to assignment.
// Mirrors the backend's DTOs (backend/src/jobs/dispatch.ts and candidates.ts).
import type { PickedAddress } from "@/components/ui/places-field";

export interface DispatchFacts {
  reference: string;
  trade: string;
  description: string | null;
  suburb: string;
  siteAddress: PickedAddress | null;
  customerName: string;
  /** Feature 4006: the job's real status, for the page's tag. */
  status: string;
  defaults: { date: string; startMinutes: number; holdMinutes: number };
  /** Feature 1022: "NSW time" - the label after every time the page shows */
  stateLabel: string;
  /** Feature 1020: the business hours, "HH:MM" -- the page offers start times inside them and its day view runs between them. */
  openingTime: string;
  closingTime: string;
  /** Feature 4006: "reschedule" fixes the contractor who holds the booking; absent at dispatch. */
  mode?: "reschedule";
  contractor?: { code: string; name: string; firstName: string };
}

export interface Rating {
  average: number;
  count: number;
}

export interface CandidateRow {
  code: string;
  name: string;
  ready: boolean;
  pickable: boolean;
  why: string | null;
  served: boolean;
  distanceKm: number | null;
  pay: { calloutRate: number; standardRate: number };
  rating: Rating | null;
  /** Feature 2004: a half hour of the hold is switched off in his Availability */
  notAvailable: boolean;
  /** Feature 2004: Not available is the only problem - "Change availability" is offered */
  linkable: boolean;
  /** Feature 2004: he has never saved his Availability */
  availabilityNotSet: boolean;
}

export type ServiceLevel = "normal" | "weekend" | "emergency";

export interface CandidatesResponse {
  level: ServiceLevel;
  price: { calloutRate: string; standardRate: string };
  serves: CandidateRow[];
  outside: CandidateRow[];
}

export const LEVEL_LABELS: Record<ServiceLevel, string> = {
  normal: "Normal",
  weekend: "Weekend",
  emergency: "Emergency",
};

export function moneyCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${String(dollars)}` : `$${dollars.toFixed(2)}`;
}
