// The customer portal's nav list -- Feature 1018, the frontend frame.
//
// Architecture & Routing / Portal menus, Customer row, in order. Feature 6010
// built the pages, so the entries are on (never a dead link). Payments is not a menu entry: refunds sit
// under Invoices (6010 UAT).
import type { PortalNavItem } from "./ops-nav";

export const CUSTOMER_NAV_ITEMS: readonly PortalNavItem[] = [
  { key: "jobs", label: "Jobs", href: "/account/jobs", built: true },
  { key: "invoices", label: "Invoices", href: "/account/invoices", built: true },
  { key: "profile", label: "Profile", href: "/account/profile", built: true },
] as const;
