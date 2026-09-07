// The ops Service area tab's content -- Feature 2002, plan decision 9: Save
// returns to the contractor list with the toast (the record page's one
// rule, same as 2001's own Save); Cancel goes back to the list too, no
// toast.
"use client";

import { useRouter } from "next/navigation";
import { ContractorRecordHeader } from "./record-header";
import { ServiceArea, type ServiceAreaDto } from "@/components/service-area/service-area";
import type { ContractorDto } from "./types";

export function OpsServiceAreaPanel({ contractor, initial }: { contractor: ContractorDto; initial: ServiceAreaDto }) {
  const router = useRouter();

  return (
    <div>
      <ContractorRecordHeader contractor={contractor} activeTab="service-area" />
      <ServiceArea
        putUrl={`/api/contractors/${contractor.code}/service-area`}
        initial={initial}
        mode="ops"
        contractorName={contractor.name}
        onSaved={(toastText) => router.push(`/ops/contractors?toast=${encodeURIComponent(toastText)}`)}
        onCancel={() => router.push("/ops/contractors")}
      />
    </div>
  );
}
