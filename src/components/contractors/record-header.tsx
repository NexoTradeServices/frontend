// The contractor record's shared header -- breadcrumb, title + tags, tab
// strip. Feature 2001 (Details) and Feature 2002 (Service area) render the
// SAME header so the tab strip stays one component, never duplicated per
// tab (Record tabs, frontend-conventions.md): a tab whose surface cannot
// exist yet does not show -- so this carries only Details on /new (no
// contractor yet), and both tabs once the record exists.
import Link from "next/link";
import { fmtDate, recordTagClasses, type ContractorDto } from "./types";

export function ContractorRecordHeader({
  contractor,
  activeTab,
}: {
  contractor: ContractorDto | null;
  activeTab: "details" | "service-area";
}) {
  const headTags: { kind: "active" | "suspended"; label: string }[] = contractor
    ? [{ kind: contractor.status === "active" ? "active" : "suspended", label: contractor.status === "active" ? "Active" : "Deactivated" }]
    : [];
  const readyTag = contractor
    ? { kind: (contractor.ready ? "ready" : "notready") as "ready" | "notready", label: contractor.ready ? "Ready to dispatch" : "Not ready to dispatch" }
    : null;

  return (
    <>
      <div className="mb-1.5 max-w-[760px] text-xs text-muted-text">
        <Link href="/ops/contractors" className="text-muted-text">
          Contractors
        </Link>{" "}
        / <span>{contractor ? contractor.code : "New contractor"}</span>
      </div>
      <div className="mb-4.5 flex max-w-[760px] flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-0.5 font-heading text-xl font-black text-ink md:text-[22px]">
            {contractor ? `${contractor.code} ${contractor.name}` : "New contractor"}
          </h1>
          <p className="text-[13px] text-muted-text">
            {contractor ? `Added ${fmtDate(contractor.createdAt)}. Change anything and press Save.` : "Only name, email and phone are needed to save. The rest can arrive later."}
          </p>
        </div>
        {contractor ? (
          <div className="flex gap-1.5">
            {headTags.map((t) => (
              <span key={t.label} className={recordTagClasses(t.kind)}>
                {t.label}
              </span>
            ))}
            {readyTag ? <span className={recordTagClasses(readyTag.kind)}>{readyTag.label}</span> : null}
          </div>
        ) : null}
      </div>

      {contractor ? (
        <div className="mb-4.5 flex max-w-[760px] gap-5 border-b border-hairline" role="tablist">
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
        </div>
      ) : null}
    </>
  );
}
