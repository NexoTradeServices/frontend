// The respond page's stand-alone cards -- Feature 4003.
//
// The page wears the Focused shell (Feature 1018): the Wordmark bar and the
// width come from the shell and the Container, not from here.
// Each no-longer-open card is the one shared Message card (Feature 9001): it says why and
// carries ONE button, the fix: "Go to your jobs" for an answered link, "Ring the office"
// for the others (Passwordless capability links - a dead link explains itself).
import Link from "next/link";
import { MessageCard } from "@/components/ui/message-card";
import type { RespondDead } from "./types";

export const cardClass = "rounded-card border border-hairline bg-surface p-4 md:p-5";
export const labelClass = "block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase";

const bigButton =
  "flex min-h-[52px] w-full items-center justify-center rounded-button px-4 text-center text-sm font-bold md:min-h-11";

export function GoToJobsLink({ outlined = false }: { outlined?: boolean }) {
  return (
    <Link
      href="/contractor"
      className={`${bigButton} ${outlined ? "border border-hairline bg-surface text-ink" : "bg-brand-accent text-on-accent"}`}
    >
      Go to your jobs
    </Link>
  );
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

const GO_TO_JOBS = { label: "Go to your jobs", href: "/contractor" };

function ringTheOffice(phone: string) {
  return { label: `Ring the office - ${phone}`, href: telHref(phone) };
}

export function DeadLinkCard({ dead }: { dead: RespondDead }) {
  if (dead.state === "answered") {
    return (
      <MessageCard title="Already answered" primary={GO_TO_JOBS}>
        You {dead.answer === "accepted" ? "accepted" : "declined"} {dead.jobReference} on {dead.answeredAtLabel}.
      </MessageCard>
    );
  }
  // Feature 4006: the office moved, took him off, or cancelled -- each says so and offers the one fix.
  if (dead.state === "moved") {
    return (
      <MessageCard title="This booking was changed" primary={GO_TO_JOBS}>
        Use the link in your latest message.
      </MessageCard>
    );
  }
  if (dead.state === "taken_off") {
    return (
      <MessageCard title="You're no longer booked" primary={GO_TO_JOBS}>
        You&apos;re no longer booked on {dead.jobReference}. Nothing to do.
      </MessageCard>
    );
  }
  if (dead.state === "cancelled") {
    return (
      <MessageCard title="This job was cancelled" primary={GO_TO_JOBS}>
        {dead.jobReference} was cancelled. Nothing to do.
      </MessageCard>
    );
  }
  if (dead.state === "expired") {
    return (
      <MessageCard title="This link has expired" primary={ringTheOffice(dead.officePhone)}>
        The time for {dead.jobReference} has passed. Ring the office if you can still help.
      </MessageCard>
    );
  }
  return (
    <MessageCard title="This link doesn't work" primary={ringTheOffice(dead.officePhone)}>
      Use the link in your latest message, or ring the office.
    </MessageCard>
  );
}

/** The page could not read the link at all (the backend is down) -- a reload, never a guess. */
export function UnavailableCard() {
  return <MessageCard title="We can't open this right now">Your link is fine. Please try again in a minute.</MessageCard>;
}
