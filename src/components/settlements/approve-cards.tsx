// The approve page's frame and its Message cards -- Feature 6003, settlement run.
//
// frontend-conventions.md: Templates / Shells (Focused shell: the Wordmark bar, one centered
// column up to 640px, no menu), Organisms / Cards (Message card: up to 420px, an optional icon, a
// Page title, one line of text, one Primary, an optional Link), Pages / Link pages and dead links
// (a dead link names why and carries the fix as its one Primary).
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { telHref } from "./money";
import type { ApproveDead } from "./types";

const bigButton =
  "flex min-h-[52px] w-full items-center justify-center rounded-md px-4 text-center text-sm font-bold md:min-h-11";

export function ApproveFrame({ displayName, children }: { displayName: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      {/* A bare <header>: the one banner landmark on this page. */}
      <header className="bg-ink px-4 py-3 md:px-10">
        <Wordmark name={displayName} />
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-4 md:py-8">{children}</main>
    </div>
  );
}

/** A Message card: the page has one thing to say. */
export function MessageCard({
  title,
  success = false,
  children,
  action,
}: {
  title: string;
  /** the green tick in a soft green circle above the title */
  success?: boolean;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section data-testid="message-card" className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-2.5 rounded-[10px] border border-hairline bg-surface p-5 text-center">
      {success ? (
        <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-success-bg text-brand-success">
          <svg viewBox="0 0 24 24" className="size-6" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
      <h1 className="font-heading text-xl font-extrabold text-ink md:text-[22px]">{title}</h1>
      <p className="text-sm text-secondary-text">{children}</p>
      {action}
    </section>
  );
}

export function SeeYourSettlements() {
  return (
    <Link href="/contractor/payouts" className={`${bigButton} bg-brand-accent text-on-accent`}>
      See your payouts
    </Link>
  );
}

export function RingTheOffice({ phone }: { phone: string }) {
  return (
    <a href={telHref(phone)} className={`${bigButton} bg-brand-accent text-on-accent`}>
      Ring the office - {phone}
    </a>
  );
}

export function ApprovedCard({ payDay }: { payDay: string }) {
  return (
    <MessageCard title="Approved" success action={<SeeYourSettlements />}>
      You&apos;ll be paid on {payDay}.
    </MessageCard>
  );
}

/** A link that no longer works: replaced, already approved, or not recognised. */
export function DeadApproveCard({ dead }: { dead: ApproveDead }) {
  if (dead.state === "replaced") {
    return <MessageCard title="This invoice was replaced">This invoice was replaced by a newer one. Use the link in your latest email.</MessageCard>;
  }
  if (dead.state === "approved") {
    return (
      <MessageCard title="Already approved" action={<SeeYourSettlements />}>
        You approved {dead.reference} on {dead.approvedLabel}.{" "}
        {dead.paid ? "It has been paid." : `You'll be paid on ${dead.payDay}.`}
      </MessageCard>
    );
  }
  return (
    <MessageCard title="This link doesn't work" action={<RingTheOffice phone={dead.officePhone} />}>
      Use the link in your latest email, or ring the office.
    </MessageCard>
  );
}

/** The page could not read the link at all (the backend is down) -- a reload, never a guess. */
export function ApproveUnavailableCard() {
  return (
    <MessageCard title="We can't open this right now">Your link is fine. Please try again in a minute.</MessageCard>
  );
}
