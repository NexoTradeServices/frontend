// A trade's rate ladder -- Feature 2003, AC9/AC10: one card per trade, the
// two-tier ladder as a plain table (no third/emergency row -- Contractor pay
// calculation: "There is no third row, because there is no third rate"),
// the licence line above it. Reuses the record page's own dispatch-state tag
// (contractors/types.ts) so the same trade reads the same way in both portals.
import {
  dispatchState,
  dispatchStateLabel,
  dispatchStateTagClasses,
  fmtDate,
} from "@/components/contractors/types";
import { fmtCents, type RateSpecialtyDto } from "./types";

export function RatesCard({ specialty }: { specialty: RateSpecialtyDto }) {
  const state = dispatchState(specialty.status === "active", specialty.licenceExpiry);
  const expired = state === "expired";

  return (
    <div className="rounded-[9px] border border-hairline bg-surface p-3.5">
      <div className="mb-0.5 flex items-center justify-between gap-2.5">
        <span className="font-heading text-base font-extrabold text-ink">{specialty.trade}</span>
        <span className={dispatchStateTagClasses(state)}>{dispatchStateLabel(state)}</span>
      </div>
      <p className={`mb-3 text-[13px] ${expired ? "text-brand-warning" : "text-muted-text"}`}>
        {expired
          ? `Licence ${specialty.licenceNumber} expired ${fmtDate(specialty.licenceExpiry)} -- send us your renewal to start getting ${specialty.trade.toLowerCase()} jobs again.`
          : `Licence ${specialty.licenceNumber}, expires ${fmtDate(specialty.licenceExpiry)}`}
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="border-b border-hairline pb-1.5 text-left text-[11px] font-bold tracking-[0.06em] text-muted-text uppercase">
              Level
            </th>
            <th scope="col" className="border-b border-hairline pb-1.5 text-right text-[11px] font-bold tracking-[0.06em] text-muted-text uppercase">
              Call-out
            </th>
            <th scope="col" className="border-b border-hairline pb-1.5 text-right text-[11px] font-bold tracking-[0.06em] text-muted-text uppercase">
              Per hour after
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          <tr>
            <th scope="row" className="pt-1.5 pb-1.5 text-left font-semibold text-secondary-text">
              Normal
            </th>
            <td className="pt-1.5 pb-1.5 text-right font-semibold text-ink">{fmtCents(specialty.normal.callout)}</td>
            <td className="pt-1.5 pb-1.5 text-right font-semibold text-ink">{fmtCents(specialty.normal.standard)}</td>
          </tr>
          <tr>
            <th scope="row" className="border-t border-hairline pt-1.5 pb-1.5 text-left font-semibold text-secondary-text">
              Weekend
            </th>
            <td className="border-t border-hairline pt-1.5 pb-1.5 text-right font-semibold text-ink">
              {fmtCents(specialty.weekend.callout)}
            </td>
            <td className="border-t border-hairline pt-1.5 pb-1.5 text-right font-semibold text-ink">
              {fmtCents(specialty.weekend.standard)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
