// Refunds -- Feature 6006, refunds.
// Architecture & Routing / Page inventory: `/ops/refunds`, ops + owner. Portal shell, Wide
// container, List page (Pages / Which layout each kind of page takes, "A list of records").
// The page number rides in the address (`?page=3`) with nothing else to keep today.
import { cookies } from "next/headers";
import { RefundsList } from "@/components/refunds/refunds-list";
import type { RefundsResult } from "@/components/refunds/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function RefundsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: raw } = await searchParams;
  const asked = Number.parseInt(raw ?? "1", 10);
  const page = Number.isInteger(asked) && asked > 0 ? asked : 1;
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/refunds?page=${String(page)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const data = (await res.json()) as RefundsResult;

  return (
    <Container width="wide">
      <PageHeader title="Refunds" subtitle="Every refund, newest first." />
      <RefundsList data={data} />
    </Container>
  );
}
