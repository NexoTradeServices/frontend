// Shared shapes -- Feature 2006, contractor agreement.
// Mirrors the backend's DTOs (backend/src/agreements/routes.ts).

export interface AgreementVersionDto {
  id: string;
  version: string;
  issuedAt: string;
  issuedBy: string;
  current: boolean;
}

export interface AgreementListDto {
  activeContractors: number;
  versions: AgreementVersionDto[];
}

/** GET /api/contractor/agreement -- the contractor's own read. */
export interface OwnAgreementDto {
  published: boolean;
  version: { id: string; label: string; issuedAt: string } | null;
  accepted: boolean;
  acceptedAt: string | null;
  timezone?: string;
  contractorCode: string;
}

/** The ops record's agreement state (ContractorDto.agreement). */
export interface ContractorAgreementDto {
  state: "accepted" | "not_accepted" | "none_published";
  currentVersion: string | null;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  recordAvailable: boolean;
}
