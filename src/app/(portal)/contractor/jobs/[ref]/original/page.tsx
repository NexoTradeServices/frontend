// Retired -- Feature 6004. A callback's earlier notes now sit on the job page itself, under
// the issue description. This route only sends an old link there. The owner may delete this file.
import { redirect } from "next/navigation";

export default async function OriginalJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  redirect(`/contractor/jobs/${encodeURIComponent(ref)}`);
}
