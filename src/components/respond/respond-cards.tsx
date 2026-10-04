// The respond page's frame and its stand-alone cards -- Feature 4003.
//
// The page wears no portal shell: the wordmark bar only, the same stripped
// chrome as the login gate (Foundations / Brand identity - the surfaces).
// The three dead-link cards each say why and carry ONE button, the fix:
// "Go to your jobs" for an answered link, "Ring the office" for the other
// two (Passwordless capability links - a dead link explains itself).
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import type { RespondDead } from "./types";

export const cardClass = "rounded-[10px] border border-hairline bg-surface p-4 md:p-5";
export const labelClass = "block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase";

const bigButton =
  "flex min-h-[52px] w-full items-center justify-center rounded-md px-4 text-center text-sm font-bold md:min-h-11";

export function RespondFrame({ displayName, children }: { displayName: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      {/* A bare <header>: the one banner landmark on this page. */}
      <header className="bg-ink px-4 py-3 md:px-10">
        <Wordmark name={displayName} />
      </header>
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 py-4 md:py-8">{children}</main>
    </div>
  );
}

export function GoToJobsLink({ outlined = false }: { outlined?: boolean }) {
  return (
    <Link
      href="/contractor"
      className={`${bigButton} ${outlined ? "border border-[#c9c3b8] bg-surface text-ink" : "bg-brand-accent text-on-accent"}`}
    >
      Go to your jobs
    </Link>
  );
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

function RingTheOffice({ phone }: { phone: string }) {
  return (
    <a href={telHref(phone)} className={`${bigButton} bg-brand-accent text-on-accent`}>
      Ring the office - {phone}
    </a>
  );
}

export function DeadLinkCard({ dead }: { dead: RespondDead }) {
  if (dead.state === "answered") {
    return (
      <section className={`${cardClass} flex flex-col gap-2.5`}>
        <h1 className="font-heading text-xl font-extrabold text-ink">Already answered</h1>
        <p className="text-sm text-ink">
          You {dead.answer === "accepted" ? "accepted" : "declined"} {dead.jobReference} on {dead.answeredAtLabel}.
        </p>
        <GoToJobsLink />
      </section>
    );
  }
  if (dead.state === "expired") {
    return (
      <section className={`${cardClass} flex flex-col gap-2.5`}>
        <h1 className="font-heading text-xl font-extrabold text-ink">This link has expired</h1>
        <p className="text-sm text-ink">
          The time for {dead.jobReference} has passed. Ring the office if you can still help.
        </p>
        <RingTheOffice phone={dead.officePhone} />
      </section>
    );
  }
  return (
    <section className={`${cardClass} flex flex-col gap-2.5`}>
      <h1 className="font-heading text-xl font-extrabold text-ink">This link doesn&apos;t work</h1>
      <p className="text-sm text-ink">Use the link in your latest message, or ring the office.</p>
      <RingTheOffice phone={dead.officePhone} />
    </section>
  );
}

/** The page could not read the link at all (the backend is down) -- a reload, never a guess. */
export function UnavailableCard() {
  return (
    <section className={`${cardClass} flex flex-col gap-2.5`}>
      <h1 className="font-heading text-xl font-extrabold text-ink">We can&apos;t open this right now</h1>
      <p className="text-sm text-ink">Your link is fine. Please try again in a minute.</p>
    </section>
  );
}
