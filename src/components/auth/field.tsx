// Field anatomy -- frontend-conventions.md, Components / Field anatomy.
//
// Label above the control; helper text below, replaced by an error message
// (blocking, destructive red) when one is set. No required marks -- required
// is the default (Components / Required vs optional marking).
import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
}

export function Field({ label, helper, error, id, className, ...inputProps }: FieldProps) {
  return (
    <div className="mb-3.5">
      <label
        htmlFor={id}
        className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        className={`min-h-[44px] w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
          error ? "border-brand-destructive" : "border-hairline"
        } ${className ?? ""}`}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {error ? (
        <p className="mt-[5px] text-xs text-brand-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-[5px] text-xs text-muted-text">{helper}</p>
      ) : null}
    </div>
  );
}
