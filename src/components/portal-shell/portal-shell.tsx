// The portal shell -- Feature 1006, admin settings screen; generalized to a
// shared shell across portals at Feature 2002, plan decision 2 ("the
// contractor shell is the portal shell with a contractor nav list").
//
// Layout shells: "navy sidebar (white-on-navy nav, accent active item, OWNER
// group separated), warm content area, white cards with 1px borders. Same
// bones for /account, /contractor and /ops - different nav items per role."
// Confirmed live on the Ops Portal Shell style reference, 01 Sep 2026.
//
// Feature 4001, BKLG-024 (Layout shells, as moved 10/09/26): the sidebar
// shows from 1024px (`lg`); below that it is the top app bar, and the menu
// is a drawer that slides in from the left, about 288px wide and never more
// than 85% of the screen, over a dimmed scrim -- the x, a tap on the scrim
// or Escape closes it. It carries the sidebar's exact content and order.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { OPS_NAV_ITEMS, type PortalNavItem } from "@/lib/ops-nav";
import { LogoutLink } from "@/components/auth/logout-link";
import { Wordmark } from "@/components/brand/wordmark";
import type { SessionUser } from "@/lib/session";

function NavLink({
  item,
  active,
  touch,
  onNavigate,
}: {
  item: PortalNavItem;
  active: boolean;
  /** In the drawer every link holds the 44px tap floor (Spacing & tap targets). */
  touch: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${touch ? "flex min-h-11 items-center" : "block"} px-[18px] py-[9px] text-sm font-semibold ${
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
  touch = false,
  onNavigate,
}: {
  mainItems: readonly PortalNavItem[];
  ownerItems: readonly PortalNavItem[];
  active: string;
  touch?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {mainItems.length > 0 ? (
        <div className="py-2.5">
          {mainItems.map((item) => (
            <NavLink key={item.key} item={item} active={item.key === active} touch={touch} onNavigate={onNavigate} />
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
              <NavLink key={item.key} item={item} active={item.key === active} touch={touch} onNavigate={onNavigate} />
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
  titleAside,
  breadcrumb,
}: {
  user: SessionUser;
  active: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  displayName?: string | null;
  /** Per-portal nav list (Portal menus, Architecture & Routing) -- defaults to the ops list. */
  navItems?: readonly PortalNavItem[];
  /** Sits beside the page title -- a record's status tag (Feature 4001's job page). */
  titleAside?: ReactNode;
  /** A way back above the title, for a page reached through a row -- "Jobs / JOB-1042". */
  breadcrumb?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainItems = navItems.filter((item) => item.built && !item.owner);
  const ownerItems = user.role === "owner" ? navItems.filter((item) => item.built && item.owner) : [];

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-ground">
      {/* The sidebar, 1024px and up (lg) */}
      <div className="flex min-h-screen">
        <nav aria-label="Sidebar" className="hidden w-[224px] shrink-0 flex-col bg-ink pt-[18px] pb-6 lg:flex">
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
          {/* The top app bar, below 1024px */}
          <div className="flex items-center justify-between bg-ink px-3.5 py-3 lg:hidden">
            <Wordmark name={displayName} />
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex size-11 items-center justify-center text-lg text-white"
            >
              &#9776;
            </button>
          </div>

          <div className="px-4 py-7 md:px-8">
            {breadcrumb ? <div className="mb-1 text-xs text-muted-text">{breadcrumb}</div> : null}
            <div className="mb-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="font-heading text-xl font-black text-ink md:text-[22px]">{title}</h1>
              {titleAside}
            </div>
            <p className="mb-5 text-[13px] text-muted-text">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>

      {/* The drawer, below 1024px -- same content and order as the sidebar. */}
      {menuOpen ? (
        <div className="lg:hidden">
          <div aria-hidden data-menu-scrim="" className="fixed inset-0 z-40 bg-ink/45" onClick={() => setMenuOpen(false)} />
          <div
            data-menu-drawer=""
            className="fixed inset-y-0 left-0 z-50 flex w-[min(288px,85vw)] flex-col bg-ink shadow-[8px_0_24px_color-mix(in_srgb,var(--ink)_25%,transparent)]"
          >
            <div className="flex items-center justify-between py-3 pr-2 pl-[18px]">
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
                touch
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
        </div>
      ) : null}
    </div>
  );
}
