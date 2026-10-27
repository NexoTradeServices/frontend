"use client";

// The Score row -- Feature 6009; Molecules / Form controls, Score row (the "would you recommend us"
// question).
//
// Eleven 44px square boxes numbered 0 to 10, each drawn like an Outlined button; the chosen box fills
// ink with on-ink text, like a chosen Filter pill. Tapping the chosen box again clears it, so the
// question can stay unanswered. "Not likely" and "Very likely" sit under the two ends in muted Small
// text. Phone: two rows, 0 to 5 then 6 to 10. Tablet and up: one row, 4px apart.
const LOW = [0, 1, 2, 3, 4, 5] as const;
const HIGH = [6, 7, 8, 9, 10] as const;

export function ScoreRow({
  value,
  onChange,
  label,
}: {
  /** null when unanswered. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** The group's accessible name (the question). */
  label: string;
}) {
  const box = (n: number) => (
    <button
      key={n}
      type="button"
      aria-pressed={value === n}
      aria-label={String(n)}
      onClick={() => onChange(value === n ? null : n)}
      className={`flex size-11 shrink-0 items-center justify-center rounded-button text-small font-semibold tabular-nums ${
        value === n ? "bg-ink text-on-ink" : "border border-hairline bg-surface text-ink"
      }`}
    >
      {n}
    </button>
  );
  return (
    <div role="group" aria-label={label} data-testid="score-row" data-value={value ?? ""}>
      <div className="flex flex-col gap-1 md:flex-row">
        <div className="flex gap-1">{LOW.map(box)}</div>
        <div className="flex gap-1">{HIGH.map(box)}</div>
      </div>
      <div className="mt-1 flex justify-between text-small text-muted-text max-w-[284px] md:max-w-[524px]">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}
