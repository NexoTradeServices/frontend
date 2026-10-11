// Edit a trade -- Feature 1007, ServiceType catalog screen.
// Architecture & Routing / Page inventory: `/ops/pricing`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { ServiceTypeForm, type ServiceTypeDto } from "@/components/pricing/service-type-form";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { OwnerOnly } from "@/components/auth/owner-only";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function EditServiceTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user?.role !== "owner") return <OwnerOnly user={user} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/service-types/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const serviceType = (await res.json()) as ServiceTypeDto;

  return (
    <Container width="medium">
      <PageHeader
        title={serviceType.trade}
        breadcrumb={{ label: "Pricing", href: "/ops/pricing" }}
        subtitle="Customer rates, service-level multipliers and prefilled enquiry options for this trade."
      />
      <ServiceTypeForm mode="edit" initial={serviceType} />
    </Container>
  );
}
