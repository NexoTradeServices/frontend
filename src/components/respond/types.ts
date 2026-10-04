// Shared shapes -- Feature 4003, accept / decline.
// Mirrors the backend's DTOs (backend/src/respond/service.ts). Every time
// label arrives already rendered in the job's zone -- nothing here formats a
// time.
export interface RespondOpen {
  state: "open";
  jobReference: string;
  contractorFirstName: string;
  trade: string;
  slotLabel: string;
  addressLine: string;
  contactLine: string;
  contactIsSiteContact: boolean;
  customerFirstName: string;
  description: string | null;
  answers: string[];
  instructions: { authorFirstName: string; dateLabel: string; note: string }[];
}

export type RespondDead =
  | { state: "answered"; answer: "accepted" | "declined"; answeredAtLabel: string; jobReference: string; officePhone: string }
  | { state: "expired"; jobReference: string; officePhone: string }
  | { state: "unknown"; officePhone: string };

export type RespondRead = RespondOpen | RespondDead;
