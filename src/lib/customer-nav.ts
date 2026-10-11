// The customer portal's nav list -- Feature 1018, the frontend frame.
//
// Architecture & Routing / Portal menus, Customer row, in order. None of the
// pages is built yet, so the menu shows no entries (never a dead link); each
// entry switches on in the same stroke as the feature that builds its page.
import type { PortalNavItem } from "./ops-nav";

export const CUSTOMER_NAV_ITEMS: readonly PortalNavItem[] = [
  { key: "jobs", label: "Jobs", href: "/account/jobs", built: false },
  { key: "invoices", label: "Invoices", href: "/account/invoices", built: false },
  { key: "payments", label: "Payments", href: "/account/payments", built: false },
  { key: "profile", label: "Profile", href: "/account/profile", built: false },
] as const;
