// Contractors list -- Feature 2001, contractor onboarding (Mike's path).
// Architecture & Routing / Page inventory: `/ops/contractors`, ops + owner
// (decision 5 -- contractor management is ops work, unlike the pricing pen).
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ContractorList } from "@/components/contractors/contractor-list";
import type { ContractorDto } from "@/components/contractors/types";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ContractorsPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractors`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const contractors = (await res.json()) as ContractorDto[];

  return (
    <Container width="wide">
      <PageHeader
        title="Contractors"
        subtitle="Everyone on the books. Click a row to open them. Not ready names what is missing, so nobody has to guess."
      />
      <Suspense>
        <ContractorList contractors={contractors} />
      </Suspense>
    </Container>
  );
}
