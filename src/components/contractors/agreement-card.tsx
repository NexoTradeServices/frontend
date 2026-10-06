// The ops record's Contractor agreement card -- Feature 2006.
//
// Managing the contractor record / Contract acceptance: Mike sees where the
// contractor stands -- accepted (with the date and version), not yet
// accepted, or nothing published -- and can open the stamped record. There is
// no control to accept: only the contractor can, from his own session.
"use client";

import { useState } from "react";
import { openSignedFile } from "@/lib/agreement-files";
import type { ContractorAgreementDto } from "@/components/agreement/types";
import { fmtDate, recordTagClasses } from "./types";

export function ContractorAgreementCard({ code, agreement }: { code: string; agreement: ContractorAgreementDto }) {
  const [error, setError] = useState<string | undefined>();

  async function openRecord() {
    const failed = await openSignedFile(`/api/agreements/records/${code}`);
    setError(failed ?? undefined);
  }

  return (
    <div className="rounded-[10px] border border-hairline bg-surface p-4 sm:p-5">
      <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">Contractor agreement</h3>
      {agreement.state === "accepted" && agreement.acceptedAt ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">
              Accepted
            </span>
            <span className="text-sm text-ink">
              {fmtDate(agreement.acceptedAt)}, version {agreement.acceptedVersion}
            </span>
          </div>
          {agreement.recordAvailable ? (
            <button
              type="button"
              onClick={() => void openRecord()}
              className="min-h-11 py-2.5 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
            >
              Acceptance record (PDF)
            </button>
          ) : null}
        </div>
      ) : null}
      {agreement.state === "not_accepted" ? (
        <>
          <span className={recordTagClasses("notready")}>Not yet accepted</span>
          <p className="mt-2 text-xs text-muted-text">
            Version {agreement.currentVersion} is current. Only the contractor can accept it.
          </p>
        </>
      ) : null}
      {agreement.state === "none_published" ? (
        <p className="text-[13px] text-muted-text">No agreement published yet.</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-brand-destructive">{error}</p> : null}
    </div>
  );
}
