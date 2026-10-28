// Invoice detail -- Feature 6010, customer portal. Portal shell, Wide, Record page.
// Breadcrumb "< Invoices", Facts (To, Date, Due), the Line items table with its GST rule, Primary "Pay now"
// while Open, Outlined "Download PDF"; a void invoice that was replaced carries a note with the link.
import Link from "next/link";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { formatDollars } from "@/components/request-a-job/money";
import { Card, Fact, InvoiceStatusTag, NotFoundCard } from "@/components/account/parts";
import { accountGet } from "@/lib/account-api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

interface InvoiceDto {
  reference: string;
  jobReference: string;
  status: string;
  billedTo: { name: string; businessName: string | null; abn: string | null; address: string | null };
  issued: string;
  due: string;
  lines: { kind: string; description: string; qty: number; unitPrice: number; lineTotal: number }[];
  labour: number;
  materials: number;
  gstApplied: boolean;
  gst: number;
  total: number;
  payLink: string | null;
  replacedBy: string | null;
}

const th = "px-3 py-2 text-left align-bottom text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";
const td = "px-3 py-2.5 align-top text-secondary-text";

export default async function AccountInvoicePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { status, data: invoice } = await accountGet<InvoiceDto>(`/invoices/${encodeURIComponent(ref)}`);
  if (status === 404) {
    return (
      <Container width="narrow">
        <NotFoundCard />
      </Container>
    );
  }
  if (invoice === null) return <LoadFailed />;
  const billedTo = invoice.billedTo.businessName ?? invoice.billedTo.name;

  return (
    <Container width="wide">
      <PageHeader breadcrumb={{ label: "Invoices", href: "/account/invoices" }} title={invoice.reference} tags={<InvoiceStatusTag word={invoice.status} />} />
      {invoice.replacedBy !== null ? (
        <div className="mb-4 rounded-card border border-hairline bg-surface px-3 py-2.5" data-testid="replaced-note">
          <p className="font-bold text-ink">Note</p>
          <p className="text-small text-muted-text">
            Replaced by{" "}
            <Link href={`/account/invoices/${encodeURIComponent(invoice.replacedBy)}`} className="underline underline-offset-2">
              {invoice.replacedBy}
            </Link>
          </p>
        </div>
      ) : null}
      <Card title="Invoice" aside={`for ${invoice.jobReference}`}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4.5 gap-y-3">
          <Fact label="To">
            {billedTo}
            {invoice.billedTo.businessName !== null ? <span className="block text-xs font-normal text-muted-text">Attn {invoice.billedTo.name}</span> : null}
          </Fact>
          <Fact label="Date">
            <span className="tabular-nums">{invoice.issued}</span>
          </Fact>
          <Fact label="Due">
            <span className="tabular-nums">{invoice.due}</span>
          </Fact>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
          <table className="w-full border-collapse text-sm" data-testid="invoice-lines">
            <thead>
              <tr className="border-b border-hairline">
                <th className={th}>Description</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Unit price</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={`${line.description}-${String(index)}`} className="border-b border-hairline last:border-b-0">
                  <td className={td}>{line.description}</td>
                  <td className={`${td} text-right tabular-nums`}>{line.qty}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatDollars(line.unitPrice)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatDollars(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 ml-auto grid max-w-xs gap-1 text-small text-secondary-text">
          {invoice.gstApplied ? (
            <div className="flex justify-between">
              <span>GST included</span>
              <span className="tabular-nums">{formatDollars(invoice.gst)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-ink pt-1.5 font-heading text-base font-extrabold text-ink">
            <span>Total</span>
            <span className="tabular-nums" data-testid="invoice-total">
              {formatDollars(invoice.total)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {invoice.payLink !== null ? (
            <a
              href={invoice.payLink}
              target="_blank"
              rel="noreferrer"
              className="inline-block min-h-11 rounded-button bg-brand-accent px-[18px] py-2.5 text-center text-sm font-bold text-on-accent"
            >
              Pay now
            </a>
          ) : null}
          <a
            href={`${apiUrl}/api/account/invoices/${encodeURIComponent(invoice.reference)}/pdf`}
            className="inline-flex min-h-11 items-center rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink"
          >
            Download PDF
          </a>
        </div>
      </Card>
    </Container>
  );
}
