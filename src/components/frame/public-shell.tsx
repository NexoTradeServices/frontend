// The Public shell -- Feature 1018; Templates / Shells / Public shell.
//
// For reading, like a business website: the Top bar (Wordmark; one Primary
// "Request a job"; Services, About and Contact only once each page is
// built), the Main slot, the Footer. No page uses it yet; the first
// marketing page to be built is its first user. The (public) route group's
// one layout file draws it with the identity read.
import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "./footer";
import { MainSlot } from "./main-slot";
import { TopBar } from "./top-bar";

export function PublicShell({
  displayName,
  phone,
  children,
}: {
  displayName: string | null;
  phone: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <TopBar
        displayName={displayName}
        action={
          <Link
            href="/request-a-job"
            className="inline-flex min-h-11 items-center justify-center rounded-button bg-brand-accent px-4 text-body font-bold text-on-accent"
          >
            Request a job
          </Link>
        }
      />
      <MainSlot>{children}</MainSlot>
      <Footer displayName={displayName} phone={phone} />
    </div>
  );
}
