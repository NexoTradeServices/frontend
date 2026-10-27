// The review page's Message cards -- Feature 6009, ratings and reviews.
//
// frontend-conventions.md: Organisms / Cards (Message card), Pages / Link pages and dead links (a dead
// link names why and carries the fix as its one Primary). Wording from the plan: Thank you, Already
// rated, This link has expired; an unknown link uses the existing dead-link words.
import { MessageCard, type MessagePrimary } from "@/components/ui/message-card";

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

function ringTheOffice(phone: string): MessagePrimary {
  return { label: `Ring the office - ${phone}`, href: telHref(phone) };
}

export function ThankYouCard() {
  return (
    <MessageCard title="Thank you" success>
      Your review has been sent.
    </MessageCard>
  );
}

export function AlreadyRatedCard({ jobReference }: { jobReference: string }) {
  return (
    <MessageCard title="Already rated" success>
      Thanks, we have your review for {jobReference}.
    </MessageCard>
  );
}

export function ExpiredCard({ officePhone }: { officePhone: string }) {
  return (
    <MessageCard title="This link has expired" primary={ringTheOffice(officePhone)}>
      Call us on {officePhone} if you would like to leave a review.
    </MessageCard>
  );
}

export function UnknownLinkCard({ officePhone }: { officePhone: string }) {
  return (
    <MessageCard title="This link doesn't work" primary={ringTheOffice(officePhone)}>
      Use the link in your latest email, or ring the office.
    </MessageCard>
  );
}

/** The page could not read the link at all (the backend is down) -- a reload, never a guess. */
export function ReviewUnavailableCard() {
  return <MessageCard title="We can't open this right now">Your link is fine. Please try again in a minute.</MessageCard>;
}
