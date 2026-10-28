// Invoices -- Feature 6010, customer portal. Portal shell, Wide, List page.
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { InvoicesList, type InvoiceRow } from "@/components/account/lists";
import { accountGet } from "@/lib/account-api";

export const metadata = { title: "Your invoices" };

export default async function AccountInvoicesPage() {
  const { data } = await accountGet<{ rows: InvoiceRow[]; total: number; hasMore: boolean }>("/invoices?limit=50");
  if (data === null) return <LoadFailed />;
  return (
    <Container width="wide">
      <PageHeader title="Invoices" subtitle="What you have been billed, and what is paid." />
      <InvoicesList initial={data} />
    </Container>
  );
}
