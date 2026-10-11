// The menu's items and the person block -- Feature 1018; Templates / Frame
// pieces / Sidebar and Menu drawer.
//
// One list drawn twice, by the Sidebar and by the Menu drawer, so the two
// always hold the same entries in the same order and look: 14px semibold,
// on-ink-text, 44px tall, 16px side padding; the current entry on-ink with a
// 3px brand-accent bar on its left and a faint brand-accent tint; the OWNER
// group set apart under its own Field label. At the bottom: who is logged in
// (their name, Small text, on-ink-text) and Log out.
"use client";

import Link from "next/link";
import { LogoutLink } from "@/components/auth/logout-link";
import type { PortalNavItem } from "@/lib/ops-nav";

function MenuLink({
  item,
  active,
  onNavigate,
}: {
  item: PortalNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center px-4 text-body font-semibold ${
        active ? "border-l-[3px] border-brand-accent bg-brand-accent/16 pl-[13px] text-on-ink" : "text-on-ink-text"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function MenuItems({
  mainItems,
  ownerItems,
  activeKey,
  onNavigate,
}: {
  mainItems: readonly PortalNavItem[];
  ownerItems: readonly PortalNavItem[];
  activeKey: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {mainItems.length > 0 ? (
        <div className="py-2">
          {mainItems.map((item) => (
            <MenuLink key={item.key} item={item} active={item.key === activeKey} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
      {ownerItems.length > 0 ? (
        <>
          <div className="mx-4 my-3 border-t border-on-ink/10" />
          <div className="py-2">
            <div className="px-4 pb-1.5 text-field-label font-bold tracking-[0.1em] text-on-ink-label/70 uppercase">
              Owner
            </div>
            {ownerItems.map((item) => (
              <MenuLink key={item.key} item={item} active={item.key === activeKey} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export function PersonBlock({ name }: { name: string }) {
  return (
    <div className="px-4 py-4 text-small text-on-ink-text">
      <div data-testid="menu-person">{name}</div>
      <LogoutLink onInk />
    </div>
  );
}
