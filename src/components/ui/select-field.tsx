// Dropdown pattern -- frontend-conventions.md, Components / Dropdown pattern.
//
// A short, fixed list (Timezone, Payout cycle/day, providers) uses a plain
// select. Same label/helper/error anatomy as Field (Components / Field
// anatomy), so the two sit in the same fieldrow without looking mismatched.
import type { SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helper?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
}

export function SelectField({
  label,
  helper,
  error,
  options,
  id,
  className,
  ...selectProps
}: SelectFieldProps) {
  return (
    <div className="mb-3.5">
      <label
        htmlFor={id}
        className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase"
      >
        {label}
      </label>
      <select
        id={id}
        className={`min-h-[44px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
          error ? "border-brand-destructive" : "border-hairline"
        } ${className ?? ""}`}
        aria-invalid={error ? true : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-[5px] text-xs text-brand-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-[5px] text-xs text-muted-text">{helper}</p>
      ) : null}
    </div>
  );
}
