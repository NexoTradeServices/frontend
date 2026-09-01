// Field anatomy -- frontend-conventions.md, Components / Field anatomy.
//
// Label above the control; helper text below, replaced by an error message
// (blocking, destructive red) when one is set. No required marks -- required
// is the default; an `optional` field carries an explicit, un-shouted
// "(optional)" tag next to the label (Components / Required vs optional
// marking). `prefix`/`suffix` decorate the control itself -- "$" before a
// money amount, a unit ("days", "km", "%", "min") after a number (Components
// / Money input).
import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  prefix?: string;
  suffix?: string;
}

export function Field({
  label,
  helper,
  error,
  optional,
  prefix,
  suffix,
  id,
  className,
  ...inputProps
}: FieldProps) {
  return (
    <div className="mb-3.5">
      <label
        htmlFor={id}
        className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase"
      >
        {label}
        {optional ? <span className="font-normal tracking-normal normal-case"> (optional)</span> : null}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-text">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className={`min-h-[44px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            error ? "border-brand-destructive" : "border-hairline"
          } ${prefix ? "pl-5" : ""} ${suffix ? "pr-9" : ""} ${className ?? ""}`}
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-text">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-[5px] text-xs text-brand-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-[5px] text-xs text-muted-text">{helper}</p>
      ) : null}
    </div>
  );
}
