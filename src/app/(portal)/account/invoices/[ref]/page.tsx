// Invoice detail -- Feature 6010, customer portal. Portal shell, Wide, Record page.
// Breadcrumb "< Invoices", then the invoice as the PDF reads it (who issued it, Bill to and the facts, the lines,
// the totals with Amount due, the GST rule, the questions line), Primary "Pay now" while Open, Outlined "Download PDF"; a void invoice that was replaced carries a note with the link.
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
  title: string;
  seller: { name: string; abn: string | null; address: string | null };
  accountsPhone: string;
  callbackOn: string | null;
  amountDue: number;
  billedTo: { name: string; isBusiness: boolean; businessName: string | null; abn: string | null; address: string | null };
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
  const billed = invoice.billedTo;
  const unpriced = (line: InvoiceDto["lines"][number]) => line.kind === "labour" && line.unitPrice === 0;

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
        {invoice.status === "Void" ? (
          <span
            aria-hidden="true"
            data-testid="void-stamp"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-[35deg] font-heading text-[clamp(5rem,18vw,10rem)] font-black text-destructive/40 select-none">VOID</span>
          </span>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-b border-hairline pb-4">
          <div>
            <p className="font-heading text-lg font-extrabold text-ink">{invoice.seller.name}</p>
            {invoice.seller.abn !== null ? <p className="text-small text-muted-text">ABN {invoice.seller.abn}</p> : null}
            {invoice.seller.address !== null ? <p className="text-small text-muted-text">{invoice.seller.address}</p> : null}
          </div>
          <p className="font-heading text-base font-extrabold tracking-[0.04em] text-ink">{invoice.title}</p>
        </div>

        <div className="mt-4 grid gap-x-4.5 gap-y-4 sm:grid-cols-2">
          <Fact label="Bill to">
            {billed.isBusiness ? (
              <>
                {billed.businessName}
                <span className="block font-normal text-secondary-text">Attn: {billed.name}</span>
                {billed.abn !== null ? <span className="block text-small font-normal text-secondary-text">ABN {billed.abn}</span> : null}
              </>
            ) : (
              billed.name
            )}
            {billed.address !== null ? <span className="block text-small font-normal text-muted-text">{billed.address}</span> : null}
          </Fact>
          <div className="grid grid-cols-2 gap-x-4.5 gap-y-3">
            <Fact label="Invoice No">{invoice.reference}</Fact>
            <Fact label="Job">{invoice.jobReference}</Fact>
            <Fact label="Date">
              <span className="tabular-nums">{invoice.issued}</span>
            </Fact>
            <Fact label="Due">
              <span className="tabular-nums">{invoice.due}</span>
            </Fact>
          </div>
        </div>

        {invoice.callbackOn !== null && invoice.total === 0 ? (
          <p className="mt-4 font-bold text-ink">Follow-up visit for {invoice.callbackOn} - no charge</p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-card border border-hairline">
          <table className="w-full border-collapse text-sm" data-testid="invoice-lines">
            <thead>
              <tr className="border-b border-hairline">
                <th className={th}>Description</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Rate</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={`${line.description}-${String(index)}`} className="border-b border-hairline last:border-b-0">
                  <td className={td}>{line.description}</td>
                  <td className={`${td} text-right tabular-nums`}>{line.qty}</td>
                  <td className={`${td} text-right tabular-nums`}>{unpriced(line) ? "" : formatDollars(line.unitPrice)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatDollars(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 ml-auto grid max-w-xs gap-1 text-small text-secondary-text">
          <div className="flex justify-between">
            <span>{invoice.gstApplied ? "Total (includes GST)" : "Total"}</span>
            <span className="tabular-nums" data-testid="invoice-total">
              {formatDollars(invoice.total)}
            </span>
          </div>
          {invoice.gstApplied ? (
            <div className="flex justify-between">
              <span>GST included</span>
              <span className="tabular-nums">{formatDollars(invoice.gst)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-ink pt-1.5 font-heading text-base font-extrabold text-ink">
            <span>Amount due</span>
            <span className="tabular-nums" data-testid="invoice-amount-due">
              {formatDollars(invoice.amountDue)}
            </span>
          </div>
        </div>
        {!invoice.gstApplied ? <p className="mt-3 text-small text-muted-text">GST: Not applicable - this business is not registered for GST.</p> : null}
        <p className="mt-3 text-small text-muted-text">Questions about this bill? Call {invoice.accountsPhone}</p>

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
