// "Change availability" on the dispatch page -- Feature 2004. Offered only when Not available is the SOLE problem with a
// candidate: Mike has the contractor's yes on the phone and opens that time. A Standard dialog holding one day of the
// Availability grid - no week arrows, no copy buttons - and Save. When it is saved the dispatch page refreshes its list.
"use client";

import { useEffect, useState } from "react";
import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { mondayOf, type WeekDto } from "@/components/availability/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export function ChangeAvailabilityDialog({
  contractorCode,
  contractorName,
  date,
  onClose,
  onSaved,
}: {
  contractorCode: string;
  contractorName: string;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [week, setWeek] = useState<WeekDto | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void fetch(`${apiUrl}/api/contractors/${encodeURIComponent(contractorCode)}/availability?week=${mondayOf(date)}`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<WeekDto>) : null))
      .then((body) => {
        if (!live) return;
        if (body === null) setFailed(true);
        else setWeek(body);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [contractorCode, date]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-6">
      <div role="dialog" aria-modal="true" aria-labelledby="change-availability-title" className="w-full max-w-[520px] rounded-card border border-hairline bg-surface p-5">
        <h4 id="change-availability-title" className="mb-1 font-heading text-name font-extrabold text-ink">
          Change {contractorName.split(" ")[0] ?? contractorName}&apos;s availability
        </h4>
        <p className="mb-3 text-small text-secondary-text">Only with {contractorName.split(" ")[0] ?? contractorName}&apos;s yes. Switch the time on, then Save.</p>
        {failed ? <p className="text-small text-brand-destructive">Couldn&apos;t load the day - try again shortly.</p> : null}
        {week === null && !failed ? <div aria-hidden="true" className="h-24 rounded-button bg-ground" /> : null}
        {week !== null ? (
          <AvailabilityGrid
            base={`/api/contractors/${contractorCode}`}
            initial={week}
            onlyDate={date}
            onSaved={() => {
              onSaved();
              onClose();
            }}
          />
        ) : null}
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-button border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
