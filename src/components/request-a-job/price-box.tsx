// The two prices for a trade and a date -- Feature 3001's Price step, shared with Feature 3005's
// Phone intake page so Mike reads out exactly what the customer would see on the form.
import { formatDollars } from "./money";

export function PriceBox({ weekend, calloutRate, standardRate }: { weekend: boolean; calloutRate: number; standardRate: number }) {
  return (
    <div data-testid="price-box" className="rounded-small-box bg-ground p-3.5">
      <span className="mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase">
        {weekend ? "Weekend rate" : "Standard Rate"}
      </span>
      <div className="font-heading text-page-title font-extrabold text-ink">{formatDollars(calloutRate)}</div>
      <p className="text-caption text-muted-text">then {formatDollars(standardRate)} per additional hour</p>
    </div>
  );
}
