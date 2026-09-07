// Trades -- repeatable, structured rows. Feature 2001, contractor onboarding
// (Mike's path), plan decision 2 ("a repeatable sub-form ... { trade,
// call-out rate, standard rate, licence number, licence expiry }"). Not the
// generic RepeatableRows (1007/1012) -- each row here is five fields plus,
// once the contractor exists, its own status switch and audit caption
// (decision 8). Confirmed on the Contractor onboarding flow walkthrough,
// 03 Sep 2026.
"use client";

import { SelectField } from "@/components/ui/select-field";
import { Field } from "@/components/auth/field";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { dispatchState, dispatchStateLabel, dispatchStateTagClasses, isFutureDate } from "./types";

export interface TradeRowDraft {
  key: string;
  trade: string;
  callout: string; // dollars, "200.00"
  standard: string; // dollars
  licenceNumber: string;
  licenceExpiry: string; // yyyy-mm-dd
  active: boolean;
  // The status this row last saved as -- compared against the live `active`
  // toggle so the caption can read "Not saved yet" instead of a stale
  // stamp while they disagree (frontend-conventions / Portal form screens,
  // audit caption; 2001 change.md Discovery, 04/09/26).
  lastSavedActive: boolean;
  existing: boolean; // true once this row has been saved once (edit mode)
  statusCaption: string | null;
}

export interface TradeRowErrors {
  trade?: string;
  callout?: string;
  standard?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
}

export function emptyTradeRow(key: string): TradeRowDraft {
  return {
    key,
    trade: "",
    callout: "",
    standard: "",
    licenceNumber: "",
    licenceExpiry: "",
    active: true,
    lastSavedActive: true,
    existing: false,
    statusCaption: null,
  };
}

export function TradeRows({
  rows,
  onChange,
  tradeOptions,
  errors,
  onRemoveRefused,
}: {
  rows: TradeRowDraft[];
  onChange: (rows: TradeRowDraft[]) => void;
  tradeOptions: string[];
  errors: Record<string, TradeRowErrors>;
  /** a row that has been used on a job cannot be removed client-side; caller shows the toast */
  onRemoveRefused: () => void;
}) {
  function update(key: string, patch: Partial<TradeRowDraft>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function remove(row: TradeRowDraft) {
    if (row.existing) {
      onRemoveRefused();
      return;
    }
    onChange(rows.filter((r) => r.key !== row.key));
  }

  function add() {
    onChange(rows.concat(emptyTradeRow(`row-${String(Date.now())}-${String(Math.random())}`)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3">
        {rows.map((row, index) => {
          const rowErrors = errors[row.key] ?? {};
          const expired = row.licenceExpiry !== "" && !isFutureDate(row.licenceExpiry);
          return (
            <div
              key={row.key}
              data-trade={row.trade || undefined}
              className="relative rounded-lg border border-hairline bg-ground p-3.5"
            >
              <button
                type="button"
                aria-label="Remove this trade"
                onClick={() => remove(row)}
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-md text-lg text-muted-text"
              >
                &#215;
              </button>
              <div className="mb-2.5 flex items-center gap-2 font-heading text-[13px] font-extrabold text-ink">
                Trade {index + 1}
                {row.existing ? (
                  <span className={dispatchStateTagClasses(dispatchState(row.active, row.licenceExpiry))}>
                    {dispatchStateLabel(dispatchState(row.active, row.licenceExpiry))}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  id={`${row.key}-trade`}
                  label="Trade"
                  value={row.trade}
                  onChange={(e) => update(row.key, { trade: e.target.value })}
                  error={rowErrors.trade}
                  options={[{ value: "", label: "Choose" }, ...tradeOptions.map((t) => ({ value: t, label: t }))]}
                />
                <Field
                  id={`${row.key}-callout`}
                  label="Call-out rate"
                  prefix="$"
                  placeholder="200.00"
                  value={row.callout}
                  onChange={(e) => update(row.key, { callout: e.target.value })}
                  error={rowErrors.callout}
                  helper={rowErrors.callout ? undefined : "First hour, once per job."}
                />
                <Field
                  id={`${row.key}-standard`}
                  label="Standard rate"
                  prefix="$"
                  placeholder="150.00"
                  value={row.standard}
                  onChange={(e) => update(row.key, { standard: e.target.value })}
                  error={rowErrors.standard}
                  helper={rowErrors.standard ? undefined : "Per hour after."}
                />
                <Field
                  id={`${row.key}-licenceNumber`}
                  label="Licence number"
                  placeholder="PL-8841"
                  value={row.licenceNumber}
                  onChange={(e) => update(row.key, { licenceNumber: e.target.value })}
                  error={rowErrors.licenceNumber}
                />
                <Field
                  id={`${row.key}-licenceExpiry`}
                  label="Licence expiry"
                  type="date"
                  value={row.licenceExpiry}
                  onChange={(e) => update(row.key, { licenceExpiry: e.target.value })}
                  error={rowErrors.licenceExpiry}
                  warning={
                    !rowErrors.licenceExpiry && expired
                      ? "Already expired -- this trade cannot be dispatched until renewed."
                      : undefined
                  }
                />
                {row.existing ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">
                      Status
                    </span>
                    <label className="flex items-center gap-2.5">
                      <ToggleSwitch
                        checked={row.active}
                        onChange={(checked) => update(row.key, { active: checked })}
                        label={`${row.trade || "Trade"} status`}
                      />
                      <span className="font-semibold text-ink">
                        {row.active ? "Active -- in dispatch" : "Suspended -- out of dispatch"}
                      </span>
                    </label>
                    {row.active !== row.lastSavedActive ? (
                      <p className="mt-1.5 text-xs text-muted-text">Not saved yet</p>
                    ) : row.statusCaption ? (
                      <p className="mt-1.5 text-xs text-muted-text">{row.statusCaption}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={add} className="min-h-11 border-0 bg-none py-2 font-bold text-brand-accent">
        + Add another trade
      </button>
      <p className="mt-1 text-xs text-muted-text">
        Each trade needs all five: trade, both rates, licence number and expiry. Half a trade cannot be dispatched.
      </p>
    </div>
  );
}
