// Phone intake -- Feature 3005, phone-taken job intake.
// Architecture & Routing / Page inventory: `/ops/jobs/new`, ops + owner. Portal shell, Medium, a Form
// page (a record edited as a form). The form's trades and questions come from the public form-data
// read, so Mike sees exactly what the customer would on the web form.
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { PhoneIntakeForm } from "@/components/jobs/phone-intake-form";
import type { FormDataDto } from "@/components/request-a-job/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = { title: "New phone job" };

export default async function PhoneIntakePage() {
  const res = await fetch(`${apiUrl}/api/enquiries/form-data`, { cache: "no-store" });
  if (res.status !== 200) return <LoadFailed />;
  const formData = (await res.json()) as FormDataDto;

  return (
    <Container width="medium">
      <PageHeader
        breadcrumb={{ label: "Jobs", href: "/ops/jobs" }}
        title="New phone job"
        subtitle="Key the job while the customer is on the line."
      />
      <PhoneIntakeForm formData={formData} />
    </Container>
  );
}
