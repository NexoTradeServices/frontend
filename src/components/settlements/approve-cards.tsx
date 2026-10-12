// The approve page's Message cards -- Feature 6003, settlement run; the shared Message card by 9001.
//
// frontend-conventions.md: Templates / Shells (Focused shell: the Wordmark bar, no menu -- drawn
// by the shell's layout file since Feature 1018, with the width from the Container), Organisms / Cards (Message card: up to 420px, an optional icon, a
// Page title, one line of text, one Primary, an optional Link), Pages / Link pages and dead links
// (a dead link names why and carries the fix as its one Primary).
import { MessageCard, type MessagePrimary } from "@/components/ui/message-card";
import { telHref } from "./money";
import type { ApproveDead } from "./types";

const SEE_YOUR_PAYOUTS: MessagePrimary = { label: "See your payouts", href: "/contractor/payouts" };

function ringTheOffice(phone: string): MessagePrimary {
  return { label: `Ring the office - ${phone}`, href: telHref(phone) };
}

export function ApprovedCard({ payDay }: { payDay: string }) {
  return (
    <MessageCard title="Approved" success primary={SEE_YOUR_PAYOUTS}>
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
      <MessageCard title="Already approved" primary={SEE_YOUR_PAYOUTS}>
        You approved {dead.reference} on {dead.approvedLabel}.{" "}
        {dead.paid ? "It has been paid." : `You'll be paid on ${dead.payDay}.`}
      </MessageCard>
    );
  }
  return (
    <MessageCard title="This link doesn't work" primary={ringTheOffice(dead.officePhone)}>
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
