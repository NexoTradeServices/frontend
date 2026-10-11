// The Portal shell -- Feature 1018; Templates / Shells / Portal shell and
// The login gate.
//
// ONE shell for all three portals (/ops, /contractor, /account); only the
// menu differs, taken from the Portal menus table (lib/portal-menu.ts). The
// (portal) route group's one layout file draws this around every page:
//
//   - Desktop and up: the Sidebar down the left, the page to its right.
//   - Phone and Tablet: the ink Top bar with the menu icon (at the left,
//     beside the Wordmark) and the Menu drawer the icon opens.
//   - No footer.
//
// The login gate lives here (Templates / Shells / The login gate): a portal
// URL visited logged out draws the Focused frame with the login card at the
// SAME URL; logged in with another portal's role, the wrong-portal card in
// the Focused frame. Never a redirect, never a login URL. The page itself
// is not rendered in either case.
//
// A Next.js layout does not see the URL, so this client component reads the
// path to know which portal it is and which menu entry is current.
"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { Container } from "@/components/frame/container";
import { FocusedShell } from "@/components/frame/focused-shell";
import { MainSlot } from "@/components/frame/main-slot";
import { MenuDrawer } from "@/components/frame/menu-drawer";
import { Sidebar } from "@/components/frame/sidebar";
import { TopBar } from "@/components/frame/top-bar";
import { portalMenu } from "@/lib/portal-menu";
import { PORTALS, portalForPath } from "@/lib/portal-roots";
import type { SessionUser } from "@/lib/session";

export function PortalShell({
  user,
  displayName,
  children,
}: {
  user: SessionUser | null;
  displayName: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The drawer is open for the path it was opened on: moving to another page
  // closes it, with no effect needed.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const portal = portalForPath(pathname);

  if (portal === null) {
    return <FocusedShell displayName={displayName}>{children}</FocusedShell>;
  }

  const { name: portalName, roles } = PORTALS[portal];

  if (user === null) {
    return (
      <FocusedShell displayName={displayName}>
        <Container width="narrow">
          <LoginGate portalName={portalName} />
        </Container>
      </FocusedShell>
    );
  }

  if (!roles.includes(user.role)) {
    return (
      <FocusedShell displayName={displayName}>
        <Container width="narrow">
          <WrongDoor user={user} portalName={portalName} />
        </Container>
      </FocusedShell>
    );
  }

  const menu = portalMenu(portal, user.role, pathname);
  const menuOpen = openedAt === pathname;

  return (
    <div className="flex min-h-screen bg-ground">
      <Sidebar displayName={displayName} menu={menu} userName={user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          displayName={displayName}
          hiddenFromDesktop
          leading={
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setOpenedAt(pathname)}
              className="-ml-3 flex size-11 items-center justify-center text-on-ink"
            >
              <Menu size={20} aria-hidden />
            </button>
          }
        />
        <MainSlot>{children}</MainSlot>
      </div>
      <MenuDrawer
        open={menuOpen}
        onOpenChange={(open) => setOpenedAt(open ? pathname : null)}
        displayName={displayName}
        menu={menu}
        userName={user.name}
      />
    </div>
  );
}
