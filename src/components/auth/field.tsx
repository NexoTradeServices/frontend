// Field anatomy -- frontend-conventions.md, Components / Field anatomy.
//
// Label above the control; helper text below, replaced by an error message
// (blocking, destructive red) when one is set. Two ways to mark the
// required/optional split, pick whichever is the MINORITY on the screen:
// an `optional` field carries an explicit, un-shouted "(optional)" tag
// (the original convention, still the default -- Components / Required vs
// optional marking); a `required` field carries a small asterisk instead,
// for a screen where most fields are optional and the few required ones
// are the exception worth calling out (feature 2001's contractor form --
// owner's call, 04/09/26: with only 3 of ~15 fields required, tagging
// every other field "(optional)" read as noise/confusing rather than
// informative). `prefix`/`suffix` decorate the control itself -- "$"
// before a money amount, a unit ("days", "km", "%", "min") after a number
// (Components / Money input).
import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
  /** true, never an error -- the value stands, only the consequence differs (e.g. an already-expired date). */
  warning?: string;
  optional?: boolean;
  /** the alternative to `optional` -- mark the required exception instead of the optional majority. */
  required?: boolean;
  prefix?: string;
  suffix?: string;
}

export function Field({
  label,
  helper,
  error,
  warning,
  optional,
  required,
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
        className={`mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase ${
          // A CSS-generated mark, not DOM text: the star never enters the
          // label's accessible name (a screen reader stays at "Name", never
          // "Name star") or its text content (so `getByLabel("Name", {
          // exact: true })` keeps matching -- both would break if the star
          // were a rendered child, aria-hidden or not (Playwright's
          // getByLabel matches raw label text, not the full accname
          // algorithm getByRole uses).
          required ? "after:ml-0.5 after:text-brand-destructive after:content-['*']" : ""
        }`}
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
          aria-required={required ? true : undefined}
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
      ) : warning ? (
        <p className="mt-[5px] text-xs text-brand-warning">{warning}</p>
      ) : helper ? (
        <p className="mt-[5px] text-xs text-muted-text">{helper}</p>
      ) : null}
    </div>
  );
}
