// Payments -- Feature 6010, customer portal. Portal shell, Wide, List page: payments and refunds, newest first.
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { PaymentsList, type PaymentRow } from "@/components/account/lists";
import { accountGet } from "@/lib/account-api";

export const metadata = { title: "Your payments" };

export default async function AccountPaymentsPage() {
  const { data } = await accountGet<{ rows: PaymentRow[] }>("/payments");
  if (data === null) return <LoadFailed />;
  return (
    <Container width="wide">
      <PageHeader title="Payments" subtitle="What you have paid, and anything refunded." />
      <PaymentsList rows={data.rows} />
    </Container>
  );
}
