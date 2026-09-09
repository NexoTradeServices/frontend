// The contractor portal shell's nav list -- Feature 2002, service area
// builder, plan decision 2.
//
// Architecture & Routing / Portal menus, Contractor row, in order. At 2002
// only Service area is built, so it is the only entry that renders (the
// shell never renders a link to a page that does not exist yet -- Layout
// shells: "never a dead link"); the rest switch on as 2003+ ships them.
import type { PortalNavItem } from "./ops-nav";

export const CONTRACTOR_NAV_ITEMS: readonly PortalNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/contractor", built: true },
  { key: "calendar", label: "Calendar", href: "/contractor/calendar", built: false },
  { key: "settlements", label: "Settlements", href: "/contractor/settlements", built: false },
  { key: "rates", label: "Rates", href: "/contractor/rates", built: true },
  { key: "service-area", label: "Service area", href: "/contractor/service-area", built: true },
  { key: "my-details", label: "My details", href: "/contractor/details", built: false },
] as const;
