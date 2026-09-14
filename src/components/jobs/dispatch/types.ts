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
  defaults: { date: string; startMinutes: number; holdMinutes: number };
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
