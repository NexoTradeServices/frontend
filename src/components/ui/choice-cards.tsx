// Choice cards -- radio-style cards in a column (frontend-conventions.md, Atoms / Form controls, Priced option, without
// the price). One choice from a short list, none chosen until the person taps one. Feature 5002: the Return visit's Reason
// and "When is the return?" use it instead of a native dropdown.
"use client";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** One line under the label. */
  hint?: string;
}

export function ChoiceCards<T extends string>({
  label,
  id,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  required?: boolean;
  /** "" while nothing is chosen. */
  value: T | "";
  options: readonly ChoiceOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="mb-3.5" role="radiogroup" aria-labelledby={`${id}-label`} aria-required={required ? true : undefined}>
      <span
        id={`${id}-label`}
        className={`mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase ${
          required ? "after:ml-0.5 after:text-brand-destructive after:content-['*']" : ""
        }`}
      >
        {label}
      </span>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const chosen = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onChange(option.value)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-button border bg-surface px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink/10 ${
                chosen ? "border-2 border-brand-accent" : "border-hairline"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${chosen ? "border-brand-accent" : "border-hairline"}`}
              >
                {chosen ? <span className="size-2.5 rounded-full bg-brand-accent" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                {option.hint ? <span className="block text-xs text-muted-text">{option.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
