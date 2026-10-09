// One of the contractor's invoices -- Feature 6003, settlement run.
// Architecture & Routing / Page inventory: `/contractor/payouts/[ref]`, contractor only. Portal
// shell, Record page. Another contractor's invoice, a replaced one, or one that does not exist all
// read as not found, never as a hint that it exists.
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { PortalShell } from "@/components/portal-shell/portal-shell";
import { CONTRACTOR_NAV_ITEMS } from "@/lib/contractor-nav";
import { ApproveHere } from "@/components/settlements/approve-here";
import { InvoiceCard } from "@/components/settlements/invoice-card";
import type { ContractorDetail } from "@/components/settlements/types";

const PORTAL_NAME = "Contractor portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const tagClass = "inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase";
const TAGS = {
  draft: { label: "Awaiting your approval", colours: "bg-warning-bg text-brand-warning" },
  approved: { label: "Approved", colours: "bg-status-cancelled-bg text-status-cancelled" },
  paid: { label: "Paid", colours: "bg-success-bg text-brand-success" },
} as const;

function BackToSettlements() {
  return (
    <Link href="/contractor/payouts" className="inline-flex min-h-11 min-w-11 items-center text-muted-text underline underline-offset-2">
      Payouts
    </Link>
  );
}

export default async function ContractorSettlementPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  if (user.role !== "contractor") return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/contractor/settlements/${encodeURIComponent(ref)}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status === 404) {
    return (
      <PortalShell
        user={user}
        active="settlements"
        title={ref}
        subtitle="This invoice isn't one of yours."
        breadcrumb={<BackToSettlements />}
        displayName={displayName}
        navItems={CONTRACTOR_NAV_ITEMS}
      >
        <div className="rounded-[10px] border border-hairline bg-surface p-4 text-sm text-secondary-text md:p-5">
          We couldn&apos;t find that invoice. Your invoices are on the Payouts page.
        </div>
      </PortalShell>
    );
  }
  if (res.status !== 200) return <WrongDoor user={user} portalName={PORTAL_NAME} displayName={displayName} />;
  const detail = (await res.json()) as ContractorDetail;
  const invoice = detail.invoice;
  const tag = invoice.preview
    ? { label: "Next payout", colours: "bg-status-new-bg text-status-new" }
    : TAGS[invoice.status === "approved" || invoice.status === "paid" ? invoice.status : "draft"];

  return (
    <PortalShell
      user={user}
      active="settlements"
      title={invoice.preview ? invoice.heading : `${invoice.heading} ${invoice.reference}`}
      subtitle={invoice.period.label}
      breadcrumb={<BackToSettlements />}
      titleAside={
        <span className={`${tagClass} ${tag.colours}`} data-testid="settlement-tag">
          {tag.label}
        </span>
      }
      displayName={displayName}
      navItems={CONTRACTOR_NAV_ITEMS}
    >
      <div className="flex flex-col gap-3">
        <InvoiceCard invoice={invoice} />
        {invoice.preview ? (
          <>
            {/* The Quiet button: Approve is not available until the Monday run makes the invoice. */}
            <button
              type="button"
              disabled
              data-testid="approve-later"
              className="flex min-h-[52px] w-full items-center justify-center rounded-md bg-hairline px-4 md:self-start text-sm font-bold text-muted-text md:min-h-11 md:w-auto md:min-w-40"
            >
              Approve
            </button>
            <p className="text-xs text-muted-text" data-testid="preview-caption">
              You can approve this on {detail.invoicedOn ?? "Monday"}, when it becomes your invoice. We will email you the link.
            </p>
          </>
        ) : invoice.status === "draft" ? (
          <>
            <p className="text-xs text-muted-text" data-testid="draft-caption">
              This is a draft until you approve it. Check it, then approve.
            </p>
            <ApproveHere reference={invoice.reference} />
          </>
        ) : null}
      </div>
    </PortalShell>
  );
}
