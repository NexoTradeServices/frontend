// The shape of GET / PUT /api/contractor/details -- Feature 2005, contractor My details.
import type { PickedAddress } from "@/components/ui/places-field";

export interface DetailsDto {
  own: {
    address: PickedAddress | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    payoutBsb: string | null;
    payoutAccountNo: string | null;
    payoutAccountName: string | null;
  };
  office: {
    name: string;
    code: string;
    email: string;
    phone: string;
    businessName: string | null;
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
