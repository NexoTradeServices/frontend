// The Focused shell -- Feature 1018; Templates / Shells / Focused shell.
//
// For doing one thing, like a checkout page: the Top bar with the Wordmark
// only, the Main slot, no footer, no sidebar, no way out but the page's own
// action. Used by the (focused) route group's one layout file, and by the
// Portal layout when it draws the login gate or the wrong-portal card.
import type { ReactNode } from "react";
import { MainSlot } from "./main-slot";
import { TopBar } from "./top-bar";

export function FocusedShell({ displayName, children }: { displayName: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <TopBar displayName={displayName} />
      <MainSlot>{children}</MainSlot>
    </div>
  );
}
