// Receivables -- Feature 6002, Stripe payment and receivables.
// Architecture & Routing / Page inventory: `/ops/receivables`, ops + owner. Portal
// shell, List page (Pages / Which template each kind of page uses).
import { cookies } from "next/headers";
import { Receivables } from "@/components/receivables/receivables";
import type { ReceivablesResult } from "@/components/receivables/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ReceivablesPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/receivables`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const initial = (await res.json()) as ReceivablesResult;

  return (
    <Container width="wide">
      <PageHeader
        title="Receivables"
        subtitle="Every invoice still owed - most overdue first."
      />
      <Receivables initial={initial} />
    </Container>
  );
}
