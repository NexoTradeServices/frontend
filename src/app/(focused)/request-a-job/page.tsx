// /request-a-job -- Feature 3001, enquiry form to job created.
// Architecture & Routing / Page inventory: the public enquiry form.
import { RequestAJobForm } from "@/components/request-a-job/request-a-job-form";
import type { FormDataDto } from "@/components/request-a-job/types";
import { Container } from "@/components/frame/container";
import { MessageCard } from "@/components/ui/message-card";
import { AlertPhone, AlertStrip } from "@/components/ui/alert-strip";
import { enquiriesOpen } from "@/lib/enquiries-open";

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
  // Feature 3006: reCAPTCHA is a gate on the live site -- with its key missing, only the
  // Alert strip shows. VERCEL_ENV (not NODE_ENV) says "the live site"; see enquiries-open.ts.
  if (
    !enquiriesOpen({
      takingEnquiries: formData.takingEnquiries,
      siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      vercelEnv: process.env.VERCEL_ENV,
    })
  ) {
    return (
      <Container width="medium">
        <AlertStrip>
          We can&apos;t take job requests online right now -- please call us on{" "}
          <AlertPhone phone={formData.operatorPhone} />.
        </AlertStrip>
      </Container>
    );
  }
  return (
    <Container width="medium">
      <RequestAJobForm formData={formData} />
    </Container>
  );
}
