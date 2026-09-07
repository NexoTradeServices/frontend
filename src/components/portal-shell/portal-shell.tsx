// The portal shell -- Feature 1006, admin settings screen; generalized to a
// shared shell across portals at Feature 2002, plan decision 2 ("the
// contractor shell is the portal shell with a contractor nav list").
//
// Layout shells: "navy sidebar (white-on-navy nav, accent active item, OWNER
// group separated), warm content area, white cards with 1px borders. Same
// bones for /account, /contractor and /ops - different nav items per role."
// Confirmed live on the Ops Portal Shell style reference, 01 Sep 2026.
//
// [IMPL] The reference draws only desktop and the 390 mobile menu, not the
// 768 tablet width in between -- the sidebar/top-app-bar swap uses
// Tailwind's `md` breakpoint (768px and up keeps the sidebar, matching the
// tablet viewport; below it is the app-bar + menu, matching the mobile
// viewport). Small and reversible; noted here rather than in plan.md since
// it is a CSS breakpoint choice, not a build decision.
"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { OPS_NAV_ITEMS, type PortalNavItem } from "@/lib/ops-nav";
import { LogoutLink } from "@/components/auth/logout-link";
import { Wordmark } from "@/components/brand/wordmark";
import type { SessionUser } from "@/lib/session";

function NavLink({ item, active, onNavigate }: { item: PortalNavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`block px-[18px] py-[9px] text-sm font-semibold ${
        active
          ? "border-l-[3px] border-brand-accent bg-brand-accent/16 pl-[15px] text-white"
          : "text-[#b9c2cc]"
      }`}
    >
      {item.label}
    </Link>
  );
}

function NavGroups({
  mainItems,
  ownerItems,
  active,
  onNavigate,
}: {
  mainItems: readonly PortalNavItem[];
  ownerItems: readonly PortalNavItem[];
  active: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {mainItems.length > 0 ? (
        <div className="py-2.5">
          {mainItems.map((item) => (
            <NavLink key={item.key} item={item} active={item.key === active} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
      {ownerItems.length > 0 ? (
        <>
          <div className="mx-[18px] my-3.5 border-t border-white/10" />
          <div className="py-2.5">
            <div className="px-[18px] pb-1.5 text-[11px] font-bold tracking-[0.1em] text-[#dfe4e9]/70 uppercase">
              Owner
            </div>
            {ownerItems.map((item) => (
              <NavLink key={item.key} item={item} active={item.key === active} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export function PortalShell({
  user,
  active,
  title,
  subtitle,
  children,
  displayName = null,
  navItems = OPS_NAV_ITEMS,
}: {
  user: SessionUser;
  active: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  displayName?: string | null;
  /** Per-portal nav list (Portal menus, Architecture & Routing) -- defaults to the ops list. */
  navItems?: readonly PortalNavItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainItems = navItems.filter((item) => item.built && !item.owner);
  const ownerItems = user.role === "owner" ? navItems.filter((item) => item.built && item.owner) : [];

  return (
    <div className="min-h-screen bg-ground">
      {/* Desktop sidebar (md and up) */}
      <div className="flex min-h-screen">
        <nav aria-label="Sidebar" className="hidden w-[224px] shrink-0 flex-col bg-ink pt-[18px] pb-6 md:flex">
          <div className="px-[18px] pb-[18px]">
            <Wordmark name={displayName} />
          </div>
          <NavGroups mainItems={mainItems} ownerItems={ownerItems} active={active} />
          <div className="mt-auto px-[18px] pt-[18px] text-xs text-[#b9c2cc]">
            {user.email}
            <div className="mt-1">
              <LogoutLink />
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {/* Mobile / tablet-below-md top app bar */}
          <div className="flex items-center justify-between bg-ink px-3.5 py-3 md:hidden">
            <Wordmark name={displayName} />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="flex size-11 items-center justify-center text-lg text-white"
            >
              &#9776;
            </button>
          </div>

          <div className="px-4 py-7 md:px-8">
            <h1 className="mb-0.5 font-heading text-xl font-black text-ink md:text-[22px]">{title}</h1>
            <p className="mb-5 text-[13px] text-muted-text">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>

      {/* The mobile menu -- same content and order as the sidebar, full-screen over navy. */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink md:hidden">
          <div className="flex items-center justify-between px-3.5 py-3">
            <Wordmark name={displayName} />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="flex size-11 items-center justify-center text-base text-white"
            >
              &#215;
            </button>
          </div>
          <nav aria-label="Menu" className="overflow-y-auto pb-5">
            <NavGroups
              mainItems={mainItems}
              ownerItems={ownerItems}
              active={active}
              onNavigate={() => setMenuOpen(false)}
            />
          </nav>
          <div className="mt-auto px-[18px] py-4 text-xs text-[#b9c2cc]">
            {user.email}
            <div className="mt-1">
              <LogoutLink />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
