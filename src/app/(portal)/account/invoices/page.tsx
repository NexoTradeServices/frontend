// Invoices -- Feature 6010, customer portal. Portal shell, Wide, List page. A "Refunds" section under the list
// when she has any: the refund, its invoice, how, the amount and the receipt PDF.
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { InvoicesList, PaymentsList, type InvoiceRow, type PaymentRow } from "@/components/account/lists";
import { accountGet } from "@/lib/account-api";

export const metadata = { title: "Your invoices" };

export default async function AccountInvoicesPage() {
  const [{ data }, { data: payments }] = await Promise.all([
    accountGet<{ rows: InvoiceRow[]; total: number; hasMore: boolean }>("/invoices?limit=50"),
    accountGet<{ rows: PaymentRow[] }>("/payments"),
  ]);
  if (data === null) return <LoadFailed />;
  const refunds = (payments?.rows ?? []).filter((row) => row.kind === "refund");
  return (
    <Container width="wide">
      <PageHeader title="Invoices" subtitle="What you have been billed, and what is paid." />
      <InvoicesList initial={data} />
      {refunds.length > 0 ? (
        <section className="mt-8" data-testid="refunds-section">
          <h2 className="mb-3 font-heading text-base font-extrabold text-ink">Refunds</h2>
          <PaymentsList rows={refunds} />
        </section>
      ) : null}
    </Container>
  );
}
