// What the Portal shell's menu shows for one portal and one login --
// Feature 1018, the frontend frame (Templates / Frame pieces / Sidebar).
//
// Only built entries show. The OWNER group shows to the owner role only. The
// current entry is found from the URL, never handed in by a page: the entry
// whose address is the longest match of the path (the contractor Dashboard,
// at /contractor, is then current on every contractor page that is not
// another entry's).
import { OPS_NAV_ITEMS, type PortalNavItem } from "./ops-nav";
import { CONTRACTOR_NAV_ITEMS } from "./contractor-nav";
import { CUSTOMER_NAV_ITEMS } from "./customer-nav";
import type { PortalKey } from "./portal-roots";
import type { Role } from "./session";

const NAV_LISTS: Record<PortalKey, readonly PortalNavItem[]> = {
  ops: OPS_NAV_ITEMS,
  contractor: CONTRACTOR_NAV_ITEMS,
  account: CUSTOMER_NAV_ITEMS,
};

export interface PortalMenu {
  mainItems: PortalNavItem[];
  ownerItems: PortalNavItem[];
  /** The key of the current entry, or null when the path is not under any shown entry. */
  activeKey: string | null;
}

export function portalMenu(portal: PortalKey, role: Role, pathname: string): PortalMenu {
  const list = NAV_LISTS[portal];
  const mainItems = list.filter((item) => item.built && !item.owner);
  const ownerItems = role === "owner" ? list.filter((item) => item.built && item.owner) : [];

  let activeKey: string | null = null;
  let longest = -1;
  for (const item of [...mainItems, ...ownerItems]) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && item.href.length > longest) {
      activeKey = item.key;
      longest = item.href.length;
    }
  }
  return { mainItems, ownerItems, activeKey };
}
