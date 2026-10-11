// /request-a-job -- Feature 3001, enquiry form to job created.
// Architecture & Routing / Page inventory: the public enquiry form.
import { RequestAJobForm } from "@/components/request-a-job/request-a-job-form";
import type { FormDataDto } from "@/components/request-a-job/types";
import { Container } from "@/components/frame/container";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = {
  title: "Request a job",
};

export default async function RequestAJobPage() {
  const res = await fetch(`${apiUrl}/api/enquiries/form-data`, { cache: "no-store" });
  if (res.status !== 200) {
    return (
      <Container width="narrow">
        <div className="text-center">
          <h1 className="mb-2 font-heading text-card-title font-extrabold text-ink">We can&apos;t take requests right now</h1>
          <p className="text-body text-secondary-text">Please try again shortly, or call us to book directly.</p>
        </div>
      </Container>
    );
  }
  const formData = (await res.json()) as FormDataDto;
  return (
    <Container width="medium">
      <RequestAJobForm formData={formData} />
    </Container>
  );
}
