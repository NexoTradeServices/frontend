// The Sidebar -- Feature 1018; Templates / Frame pieces / Sidebar.
//
// Portal shell, Desktop and up only. Fixed width 224px, never fitted to its
// text; ink fill, full height, fixed in place while the page scrolls. The
// Wordmark at the top with 20px around it, then the menu, then who is logged
// in and Log out.
"use client";

import { Wordmark } from "@/components/brand/wordmark";
import type { PortalMenu } from "@/lib/portal-menu";
import { MenuItems, PersonBlock } from "./menu-items";

export function Sidebar({
  displayName,
  menu,
  userName,
}: {
  displayName: string | null;
  menu: PortalMenu;
  userName: string;
}) {
  return (
    <nav
      aria-label="Sidebar"
      className="sticky top-0 hidden self-start h-screen w-[224px] shrink-0 flex-col overflow-y-auto bg-ink lg:flex"
    >
      <div className="p-5">
        <Wordmark name={displayName} />
      </div>
      <MenuItems mainItems={menu.mainItems} ownerItems={menu.ownerItems} activeKey={menu.activeKey} />
      <div className="mt-auto">
        <PersonBlock name={userName} />
      </div>
    </nav>
  );
}
