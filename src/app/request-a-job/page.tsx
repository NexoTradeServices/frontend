// /request-a-job -- Feature 3001, enquiry form to job created.
// Architecture & Routing / Page inventory: the public enquiry form.
import { RequestAJobForm } from "@/components/request-a-job/request-a-job-form";
import type { FormDataDto } from "@/components/request-a-job/types";
import { getDisplayName } from "@/lib/identity";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const metadata = {
  title: "Request a job",
};

export default async function RequestAJobPage() {
  const [res, displayName] = await Promise.all([
    fetch(`${apiUrl}/api/enquiries/form-data`, { cache: "no-store" }),
    getDisplayName(),
  ]);
  if (res.status !== 200) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center px-5 text-center">
        <h1 className="mb-2 font-heading text-xl font-extrabold text-ink">We can&apos;t take requests right now</h1>
        <p className="text-sm text-secondary-text">Please try again shortly, or call us to book directly.</p>
      </main>
    );
  }
  const formData = (await res.json()) as FormDataDto;
  return <RequestAJobForm formData={formData} displayName={displayName} />;
}
