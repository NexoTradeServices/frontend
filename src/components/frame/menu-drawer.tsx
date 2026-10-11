// The Menu drawer -- Feature 1018; Templates / Frame pieces / Menu drawer.
//
// Portal shell, Phone and Tablet only. Opens from the Top bar's menu icon and
// slides in from the left over the page dimmed with ink at 40%: 288px wide,
// never more than 85% of the screen, ink fill, full height. Holds the same
// items in the same order as the Sidebar, plus who is logged in and Log out
// at the bottom, and a close x at the top right. Closes on its x, a tap
// outside it, Escape, or picking an item. Built from the shadcn Sheet.
"use client";

import { X } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { PortalMenu } from "@/lib/portal-menu";
import { MenuItems, PersonBlock } from "./menu-items";

export function MenuDrawer({
  open,
  onOpenChange,
  displayName,
  menu,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string | null;
  menu: PortalMenu;
  userName: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-menu-drawer="" aria-describedby={undefined}>
        <div className="flex items-center justify-between py-1 pr-1 pl-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Wordmark name={displayName} />
          <SheetClose
            aria-label="Close menu"
            className="flex size-11 items-center justify-center text-on-ink"
          >
            <X size={20} aria-hidden />
          </SheetClose>
        </div>
        <nav aria-label="Menu" className="overflow-y-auto pb-5">
          <MenuItems
            mainItems={menu.mainItems}
            ownerItems={menu.ownerItems}
            activeKey={menu.activeKey}
            onNavigate={() => onOpenChange(false)}
          />
        </nav>
        <div className="mt-auto">
          <PersonBlock name={userName} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
