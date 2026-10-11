// The Top bar -- Feature 1018; Templates / Frame pieces / Top bar.
//
// One piece, three settings: always ink, full width, the Wordmark at the
// left; 12px above and below; 16px at the sides on Phone, 24px Tablet, 40px
// Desktop and up. The settings differ only in what rides with the Wordmark:
//   Focused - the Wordmark only.
//   Public  - text links in the middle (tablet and up) and one Primary.
//   Portal  - the menu icon at the left of the Wordmark (Phone and Tablet;
//             the Sidebar carries the Wordmark from Desktop).
// The one <header> any page has: no page draws another (AC14).
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export function TopBar({
  displayName,
  leading,
  links,
  action,
  hiddenFromDesktop = false,
}: {
  displayName: string | null;
  /** Left of the Wordmark: the Portal setting's menu button. */
  leading?: ReactNode;
  /** The Public setting's text links, shown from Tablet up. */
  links?: ReactNode;
  /** The Public setting's one Primary, at the right. */
  action?: ReactNode;
  /** The Portal setting: not shown from Desktop up. */
  hiddenFromDesktop?: boolean;
}) {
  return (
    <header
      className={`flex items-center gap-2 bg-ink px-4 py-3 md:px-6 lg:px-10 ${hiddenFromDesktop ? "lg:hidden" : ""}`}
    >
      {leading}
      <Wordmark name={displayName} />
      {links ? <nav className="ml-6 hidden items-center gap-6 md:flex">{links}</nav> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </header>
  );
}
