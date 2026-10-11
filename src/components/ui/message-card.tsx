// The Message card -- Feature 1018; Organisms / Cards, Message card.
//
// The one Card on a page with one thing to say: a Page title, one line of
// text, one Primary. Sits in the Narrow container. Used here for "Owner only"
// and for a page that could not load; the other message pages (dead link,
// wrong portal, enquiry confirmation) are restyled to it by 9001.
import type { ReactNode } from "react";
import Link from "next/link";

export function MessageCard({
  title,
  primary,
  children,
}: {
  title: string;
  primary?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section
      data-testid="message-card"
      className="flex w-full flex-col items-center gap-2.5 rounded-card border border-hairline bg-surface p-4 text-center md:p-5"
    >
      <h1 className="font-heading text-page-title font-extrabold text-ink">{title}</h1>
      <p className="text-body text-secondary-text">{children}</p>
      {primary ? (
        <Link
          href={primary.href}
          className="inline-flex min-h-11 items-center justify-center rounded-button bg-brand-accent px-4 text-body font-bold text-on-accent"
        >
          {primary.label}
        </Link>
      ) : null}
    </section>
  );
}
