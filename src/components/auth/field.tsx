// Field anatomy -- frontend-conventions.md, Components / Field anatomy.
//
// Label above the control; helper text below, replaced by an error message
// (blocking, destructive red) when one is set. The required/optional split
// marks only the required exception with a small asterisk -- never an
// "(optional)" tag on the rest, on any screen (BKLG-012, feature 2002:
// Settings and Pricing joined 2001's contractor form on this rule; the
// `optional` prop this file used to carry is gone, not just unused).
// `prefix`/`suffix` decorate the control itself -- "$" before a money
// amount, a unit ("days", "km", "%", "min") after a number (Components /
// Money input).
import { useState, type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
  /** true, never an error -- the value stands, only the consequence differs (e.g. an already-expired date). */
  warning?: string;
  /** marks the required exception with a small asterisk; unmarked fields are optional. */
  required?: boolean;
  prefix?: string;
  suffix?: string;
}

export function Field({
  label,
  helper,
  error,
  warning,
  required,
  prefix,
  suffix,
  id,
  className,
  type,
  ...inputProps
}: FieldProps) {
  // Feature 3004: every password box carries the show/hide eye at its right edge (Pages / Login and
  // password pages), built once here for type="password".
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);
  return (
    <div className="mb-3.5">
      <label
        htmlFor={id}
        className={`mb-[5px] block text-field-label font-bold tracking-[0.08em] text-muted-text uppercase ${
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
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-text">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className={`min-h-[44px] w-full rounded-button border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${
            error ? "border-brand-destructive" : "border-hairline"
          } ${prefix ? "pl-5" : ""} ${suffix ? "pr-9" : ""} ${isPassword ? "pr-11" : ""} ${className ?? ""}`}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            aria-pressed={shown}
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-text"
          >
            {/* Named by hidden text, not aria-label: a label lookup for "Password" must find the box only. */}
            <span className="sr-only">{shown ? "Hide password" : "Show password"}</span>
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {shown ? <path d="M4 4l16 16" /> : null}
            </svg>
          </button>
        ) : null}
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
