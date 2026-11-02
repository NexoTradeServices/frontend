// Add a contractor -- Feature 2001, contractor onboarding (Mike's path).
// Two pages, one form (plan decision 1): this and [code]/page.tsx render
// the same ContractorForm, blank or filled.
import { cookies } from "next/headers";
import { ContractorForm } from "@/components/contractors/contractor-form";
import { Container } from "@/components/frame/container";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function NewContractorPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractors/trade-options`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  const tradeOptions = res.status === 200 ? ((await res.json()) as { trades: string[] }).trades : [];
  const statesRes = await fetch(`${apiUrl}/api/operating-states`, { headers: { cookie: cookieStore.toString() }, cache: "no-store" });
  const openStates = statesRes.status === 200 ? ((await statesRes.json()) as { states: string[] }).states : [];

  return (
    <Container width="medium">
      <ContractorForm mode="create" initial={null} tradeOptions={tradeOptions} openStates={openStates} />
    </Container>
  );
}
