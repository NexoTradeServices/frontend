// The shape of GET / PUT /api/contractor/details -- Feature 2005, contractor My details.
import type { PickedAddress } from "@/components/ui/places-field";

export interface DetailsDto {
  own: {
    name: string;
    phone: string;
    businessName: string | null;
    address: PickedAddress | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
  office: {
    code: string;
    email: string;
    payoutBsb: string | null;
    payoutAccountNo: string | null;
    payoutAccountName: string | null;
    abn: string | null;
    gstRegistered: boolean | null;
    operatingState: string;
    specialties: { trade: string; licenceNumber: string; licenceExpiry: string }[];
    insurer: string | null;
    insurancePolicyNo: string | null;
    insuranceExpiry: string | null;
    status: "active" | "suspended";
  };
}
