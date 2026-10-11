// /request-a-job -- Feature 3001, enquiry form to job created.
// Architecture & Routing / Page inventory: the public enquiry form.
import { RequestAJobForm } from "@/components/request-a-job/request-a-job-form";
import type { FormDataDto } from "@/components/request-a-job/types";
import { Container } from "@/components/frame/container";
import { MessageCard } from "@/components/ui/message-card";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = {
  title: "Request a job",
};

export default async function RequestAJobPage() {
  const res = await fetch(`${apiUrl}/api/enquiries/form-data`, { cache: "no-store" });
  if (res.status !== 200) {
    return (
      <Container width="narrow">
        <MessageCard title="We can't take requests right now">
          Please try again shortly, or call us to book directly.
        </MessageCard>
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
