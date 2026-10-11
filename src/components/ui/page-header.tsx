// The Page header -- Feature 1018; Organisms / Page header.
//
// Every portal page draws one for itself, now the shell no longer draws a
// title: the Breadcrumb (one link back to the list, "< Jobs", never a chain)
// when the page sits under a list, the Page title (heading font, 800, ink,
// 20px Phone and 22px Tablet and up), a one-line muted subtitle in Small
// text, and room on the right of the title for Tags (`tags`, beside the
// title) or one compact Primary (`action`; under the title on Phone).
import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  tags,
  action,
}: {
  title: string;
  /** One muted line under the title; plain business words about the record. */
  subtitle?: string;
  /** The one link back to the list above this page. */
  breadcrumb?: { label: string; href: string };
  tags?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumb ? (
        <Link
          href={breadcrumb.href}
          className="-mt-2 inline-flex min-h-11 min-w-11 items-center text-small text-muted-text underline underline-offset-2"
        >
          &lt; {breadcrumb.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="font-heading text-page-title font-extrabold text-ink">{title}</h1>
          {tags}
        </div>
        {action ? <div className="self-start">{action}</div> : null}
      </div>
      {subtitle ? <p className="mt-0.5 text-small text-muted-text">{subtitle}</p> : null}
    </div>
  );
}
