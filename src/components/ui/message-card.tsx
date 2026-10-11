// The Message card -- Feature 1018 (built), Feature 9001 (every one-thing page uses it);
// Organisms / Cards, Message card; Pages / Link pages and dead links.
//
// The one Card on a page with one thing to say: an optional Icon, a Page title,
// one line of text, one Primary, an optional Link under it. Sits in the Narrow
// container. Used by the dead link, the wrong portal, "Request sent", the
// request-a-job unavailable card, the respond and approve no-longer-open cards,
// "Owner only" and "This page didn't load".
import type { ReactNode } from "react";
import Link from "next/link";

export interface MessagePrimary {
  label: string;
  /** A page address, or a `tel:` link; leave out for an action that runs here. */
  href?: string;
  onClick?: () => void;
}

const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-button bg-brand-accent px-4 text-body font-bold text-on-accent";

function SuccessIcon() {
  return (
    <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-success-bg text-brand-success">
      <svg viewBox="0 0 24 24" className="size-6" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function MessageCard({
  title,
  primary,
  link,
  success = false,
  children,
}: {
  title: string;
  primary?: MessagePrimary;
  /** The optional Link under the Primary (a Log out, a way back). */
  link?: ReactNode;
  /** A good outcome: the green tick in a soft success-bg circle above the title. */
  success?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      data-testid="message-card"
      className="flex w-full flex-col items-center gap-2.5 rounded-card border border-hairline bg-surface p-4 text-center md:p-5"
    >
      {success ? <SuccessIcon /> : null}
      <h1 className="font-heading text-page-title font-extrabold text-ink">{title}</h1>
      {children ? <div className="text-body text-secondary-text">{children}</div> : null}
      {primary?.href !== undefined ? (
        primary.href.startsWith("tel:") ? (
          <a href={primary.href} className={primaryClass}>
            {primary.label}
          </a>
        ) : (
          <Link href={primary.href} className={primaryClass}>
            {primary.label}
          </Link>
        )
      ) : primary ? (
        <button type="button" onClick={primary.onClick} className={primaryClass}>
          {primary.label}
        </button>
      ) : null}
      {link}
    </section>
  );
}
