// Repeatable form rows -- frontend-conventions.md, Components / Repeatable
// form rows.
//
// Add/remove rows, each with its own remove (x) button and a trailing
// "+ Add another" text action. Feature 1007 uses this for a ServiceType's
// prefilled enquiry-form options -- plain reorderable/removable text rows,
// no other shape implied by the design (Data Model: `prefilledFields json[]`).
//
// Feature 1012 adds the ordered variant (`ordered` prop, opt-in per use):
// up/down buttons per row, 44px tap targets, disabled at the ends. No
// drag-and-drop -- deliberately excluded by the convention (frontend-
// conventions.md, Patterns / Repeatable form rows).
export function RepeatableRows({
  label,
  helper,
  values,
  onChange,
  addLabel = "+ Add another",
  placeholder,
  ordered = false,
}: {
  label: string;
  helper?: string;
  values: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
  ordered?: boolean;
}) {
  function updateAt(index: number, value: string) {
    const next = values.slice();
    next[index] = value;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(values.slice(0, index).concat(values.slice(index + 1)));
  }

  function add() {
    onChange(values.concat(""));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = values.slice();
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === values.length - 1) return;
    const next = values.slice();
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div className="mb-3.5">
      <label className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">
        {label}
      </label>
      {values.map((value, index) => (
        <div key={index} className="mb-2 flex items-center gap-2">
          {ordered ? (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => moveUp(index)}
                className="flex size-11 items-center justify-center rounded-md border border-hairline text-base text-muted-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                &#8593;
              </button>
              <button
                type="button"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                disabled={index === values.length - 1}
                onClick={() => moveDown(index)}
                className="flex size-11 items-center justify-center rounded-md border border-hairline text-base text-muted-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                &#8595;
              </button>
            </div>
          ) : null}
          <input
            aria-label={`${label} ${index + 1}`}
            value={value}
            placeholder={placeholder}
            onChange={(e) => updateAt(index, e.target.value)}
            className="min-h-[44px] w-full flex-1 rounded-md border border-hairline bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            onClick={() => removeAt(index)}
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-hairline text-base text-muted-text"
          >
            &#215;
          </button>
        </div>
      ))}
      {helper ? <p className="mt-[-4px] mb-2 text-xs text-muted-text">{helper}</p> : null}
      <button type="button" onClick={add} className="text-[13px] font-semibold text-secondary-text underline underline-offset-2">
        {addLabel}
      </button>
    </div>
  );
}
