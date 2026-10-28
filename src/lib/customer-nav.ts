// The customer portal's nav list -- Feature 1018, the frontend frame.
//
// Architecture & Routing / Portal menus, Customer row, in order. Feature 6010
// built all four pages, so all four entries are on (never a dead link).
import type { PortalNavItem } from "./ops-nav";

export const CUSTOMER_NAV_ITEMS: readonly PortalNavItem[] = [
  { key: "jobs", label: "Jobs", href: "/account/jobs", built: true },
  { key: "invoices", label: "Invoices", href: "/account/invoices", built: true },
  { key: "payments", label: "Payments", href: "/account/payments", built: true },
  { key: "profile", label: "Profile", href: "/account/profile", built: true },
] as const;
