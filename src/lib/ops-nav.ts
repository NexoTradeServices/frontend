// The ops portal shell's nav list -- Feature 1006, admin settings screen.
//
// Architecture & Routing / Page inventory (Operations portal + Owner-only
// sections) in order. Every /ops screen shares this ONE list; an entry
// switches on (`built: true`) the moment its own feature ships the page --
// the shell never renders a link to a page that does not exist yet
// (Layout shells: "never a dead link").
export interface OpsNavItem {
  key: string;
  label: string;
  href: string;
  /** Only the owner role sees this entry (the OWNER group, separated below a divider). */
  owner?: boolean;
  built: boolean;
}

export const OPS_NAV_ITEMS: readonly OpsNavItem[] = [
  { key: "jobs", label: "Jobs", href: "/ops/jobs", built: false },
  { key: "contractors", label: "Contractors", href: "/ops/contractors", built: false },
  { key: "receivables", label: "Receivables", href: "/ops/receivables", built: false },
  { key: "refunds", label: "Refunds", href: "/ops/refunds", built: false },
  { key: "settlements", label: "Settlements", href: "/ops/settlements", built: false },
  { key: "status", label: "Service status", href: "/ops/status", built: false },
  { key: "settings", label: "Settings", href: "/ops/settings", owner: true, built: true },
  { key: "pricing", label: "Pricing", href: "/ops/pricing", owner: true, built: false },
  { key: "seo-pages", label: "SEO pages", href: "/ops/seo-pages", owner: true, built: false },
  { key: "reports", label: "Reports", href: "/ops/reports", owner: true, built: false },
] as const;
