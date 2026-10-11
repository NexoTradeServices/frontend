// Add a trade -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only
// (plan decision 3: create is included -- "a catalog the owner cannot
// extend without a developer is not a catalog").
import { getSessionUser } from "@/lib/session";
import { ServiceTypeForm, type ServiceTypeDto } from "@/components/pricing/service-type-form";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { OwnerOnly } from "@/components/auth/owner-only";


const BLANK: ServiceTypeDto = {
  id: "",
  trade: "",
  customerCalloutRate: 0,
  customerStandardRate: 0,
  serviceLevelMultipliers: { normal: 1.0, emergency: 1.5, weekend: 1.5 },
  prefilledFields: [],
};

export default async function NewServiceTypePage() {
  const user = await getSessionUser();
  if (user?.role !== "owner") return <OwnerOnly user={user} />;

  return (
    <Container width="medium">
      <PageHeader
        title="Add a trade"
        breadcrumb={{ label: "Pricing", href: "/ops/pricing" }}
        subtitle="Set its customer rates before it goes live."
      />
      <ServiceTypeForm mode="create" initial={BLANK} />
    </Container>
  );
}
