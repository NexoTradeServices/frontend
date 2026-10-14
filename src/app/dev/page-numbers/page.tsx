// A look at the Page numbers control -- Feature 6006, refunds.
//
// The control is new to the live screens, so it is built alone first and shown here for the owner
// to try on a phone before the Refunds list is built around it. Pretend list of 1,240 rows, 50 a
// page; `?page=` moves it. Dev only: in production the page does not exist.
import { notFound } from "next/navigation";
import { PageNumbers } from "@/components/ui/page-numbers";

const TOTAL = 1240;
const PAGE_SIZE = 50;

export default async function PageNumbersPreview({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { page: raw } = await searchParams;
  const pageCount = Math.ceil(TOTAL / PAGE_SIZE);
  const asked = Number.parseInt(raw ?? "1", 10);
  const page = Math.min(Math.max(Number.isInteger(asked) ? asked : 1, 1), pageCount);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, TOTAL);
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8">
      <h1 className="mb-1 font-heading text-xl font-extrabold text-ink">Page numbers</h1>
      <p className="mb-4 text-small text-muted-text">A pretend list of {TOTAL.toLocaleString("en-AU")} rows. Try Previous, Next and the numbers.</p>
      <p className="rounded-card border border-hairline bg-surface p-4 text-sm text-secondary-text">Rows {from} to {to} would be here.</p>
      <PageNumbers page={page} pageCount={pageCount} from={from} to={to} total={TOTAL} hrefFor={(n) => `/dev/page-numbers?page=${String(n)}`} />
    </main>
  );
}
