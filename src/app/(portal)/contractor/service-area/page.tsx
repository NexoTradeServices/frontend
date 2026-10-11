// Contractor's own Service area page -- Feature 2002, plan decision 1: the
// contractor comes from the session, never the URL. The contractor portal
// shell's first built entry (plan decision 2).
import { cookies } from "next/headers";
import { ServiceArea, type ServiceAreaDto } from "@/components/service-area/service-area";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorServiceAreaPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/service-area`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as ServiceAreaDto;

  return (
    <Container width="medium">
      <PageHeader
        title="Your service area"
        subtitle="Where you take jobs. Whole postcodes: keep the ones you serve, cross off the rest."
      />
      <ServiceArea putUrl="/api/contractor/service-area" initial={initial} mode="contractor" />
    </Container>
  );
}
