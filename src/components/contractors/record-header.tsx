// The contractor record's shared header -- breadcrumb, title + tags, tab
// strip. Feature 2001 (Details) and Feature 2002 (Service area) render the
// SAME header so the tab strip stays one component, never duplicated per
// tab (Record tabs, frontend-conventions.md): a tab whose surface cannot
// exist yet does not show -- so this carries only Details on /new (no
// contractor yet), and all three tabs (Details, Service area, Reviews -- Feature 6009) once the record exists.
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { fmtDate, recordTagClasses, type ContractorDto } from "./types";

export function ContractorRecordHeader({
  contractor,
  activeTab,
}: {
  contractor: ContractorDto | null;
  activeTab: "details" | "service-area" | "reviews";
}) {
  const headTags: { kind: "active" | "suspended"; label: string }[] = contractor
    ? [{ kind: contractor.status === "active" ? "active" : "suspended", label: contractor.status === "active" ? "Active" : "Deactivated" }]
    : [];
  const readyTag = contractor
    ? { kind: (contractor.ready ? "ready" : "notready") as "ready" | "notready", label: contractor.ready ? "Ready to dispatch" : "Not ready to dispatch" }
    : null;

  return (
    <>
      {/* The page's one Page header (Organisms / Page header): the Breadcrumb back to the list, the record's name,
          its muted line and its Tags. The Record tabs sit under it. */}
      <PageHeader
        breadcrumb={{ label: "Contractors", href: "/ops/contractors" }}
        title={contractor ? `${contractor.code} ${contractor.name}` : "New contractor"}
        subtitle={
          contractor
            ? `Added ${fmtDate(contractor.createdAt)}. Change anything and press Save.`
            : "Only name, email and phone are needed to save. The rest can arrive later."
        }
        tags={
          contractor ? (
            <span className="flex gap-1.5">
              {headTags.map((t) => (
                <span key={t.label} className={recordTagClasses(t.kind)}>
                  {t.label}
                </span>
              ))}
              {readyTag ? <span className={recordTagClasses(readyTag.kind)}>{readyTag.label}</span> : null}
            </span>
          ) : undefined
        }
      />

      {contractor ? (
        <div className="mb-4.5 flex gap-5 border-b border-hairline" role="tablist">
          <Link
            href={`/ops/contractors/${contractor.code}`}
            role="tab"
            aria-selected={activeTab === "details"}
            className={`pb-2 text-sm font-bold ${
              activeTab === "details" ? "border-b-2 border-brand-accent text-ink" : "text-muted-text"
            }`}
          >
            Details
          </Link>
          <Link
            href={`/ops/contractors/${contractor.code}/service-area`}
            role="tab"
            aria-selected={activeTab === "service-area"}
            className={`pb-2 text-sm font-bold ${
              activeTab === "service-area" ? "border-b-2 border-brand-accent text-ink" : "text-muted-text"
            }`}
          >
            Service area
          </Link>
          <Link
            href={`/ops/contractors/${contractor.code}/reviews`}
            role="tab"
            aria-selected={activeTab === "reviews"}
            className={`pb-2 text-sm font-bold ${
              activeTab === "reviews" ? "border-b-2 border-brand-accent text-ink" : "text-muted-text"
            }`}
          >
            Reviews
          </Link>
        </div>
      ) : null}
    </>
  );
}
