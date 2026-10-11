// The Footer -- Feature 1018; Templates / Frame pieces / Footer.
//
// Public shell only. Ground fill, a 1px hairline on top, 32px above and
// below, its content in the Wide container. The brand and the business
// phone come from settings (the identity read), never typed in; the legal
// name and the ABN are never here. Links only to pages that are built: today
// "Request a job" alone. A failed identity read leaves the name and the phone
// out and the Footer still draws.
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "./container";

/** The pages the Footer may link to, each only once built (never a dead link). */
export const FOOTER_LINKS: readonly { label: string; href: string; built: boolean }[] = [
  { label: "Services", href: "/services", built: false },
  { label: "About", href: "/about", built: false },
  { label: "Contact", href: "/contact", built: false },
  { label: "Request a job", href: "/request-a-job", built: true },
  { label: "Privacy", href: "/privacy", built: false },
  { label: "Terms", href: "/terms", built: false },
];

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function Footer({ displayName, phone }: { displayName: string | null; phone: string | null }) {
  const links = FOOTER_LINKS.filter((link) => link.built);
  return (
    <footer className="border-t border-hairline bg-ground px-4 py-8 md:px-6 lg:px-8">
      <Container width="wide">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <Wordmark name={displayName} onGround />
            {displayName ? <p className="text-small text-secondary-text">{displayName}</p> : null}
            {phone ? (
              <a
                href={phoneHref(phone)}
                className="inline-flex min-h-11 items-center text-small font-semibold text-secondary-text underline underline-offset-2"
              >
                {phone}
              </a>
            ) : null}
          </div>
          {links.length > 0 ? (
            <nav aria-label="Footer" className="flex flex-col md:flex-row md:gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-small font-semibold text-secondary-text underline underline-offset-2"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}
