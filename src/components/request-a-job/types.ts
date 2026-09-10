// Shared shapes -- Feature 3001, enquiry form to job created.
export interface ServiceLevelMultipliers {
  normal: number;
  emergency: number;
  weekend: number;
}

export interface ServiceTypeDto {
  id: string;
  trade: string;
  slug: string | null;
  customerCalloutRate: number;
  customerStandardRate: number;
  serviceLevelMultipliers: ServiceLevelMultipliers;
  prefilledFields: string[];
}

export interface FormDataDto {
  operatorPhone: string;
  serviceTypes: ServiceTypeDto[];
}

export type PreferredWindow = "morning" | "afternoon" | "evening";
