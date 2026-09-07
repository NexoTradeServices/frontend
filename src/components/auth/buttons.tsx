// Button ladder + button loading -- frontend-conventions.md, Components /
// Buttons and Patterns / Page loading vs button loading.
//
// ONE loud filled button per screen -- accent orange, never two side by side.
// Loading dims the button, spins, and replaces the label; same size,
// disabled while it works.
import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

// Two sizes of the same primary (frontend-conventions.md, Components /
// Buttons): full-width for a stacked single-column form (the login gate,
// the wrong-door card) -- the default, so every existing caller is
// untouched -- and compact, sized to its label, for an inline action beside
// a list or heading ("Add a contractor"). Confirmed live on the
// Contractors list, 04/09/26.
export type PrimarySize = "full" | "compact";

const sizeClasses: Record<PrimarySize, string> = {
  full: "mt-1.5 block min-h-[52px] w-full rounded-md px-4 py-3.5 text-center text-sm font-bold text-on-accent",
  compact: "inline-block min-h-11 rounded-md px-[18px] py-2.5 text-center text-sm font-bold text-on-accent",
};

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  size?: PrimarySize;
}

export function PrimaryButton({
  loading = false,
  loadingLabel,
  size = "full",
  children,
  disabled,
  className,
  ...buttonProps
}: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`${sizeClasses[size]} ${loading ? "bg-brand-accent-loading" : "bg-brand-accent"} ${className ?? ""}`}
      {...buttonProps}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-3 animate-spin rounded-full border-2 border-white/45 border-t-white"
          />
          {loadingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Same primary role as `PrimaryButton`, for a navigation ("Go to your portal") rather than a form submit. */
export function PrimaryLink({
  href,
  size = "full",
  children,
}: {
  href: string;
  size?: PrimarySize;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${sizeClasses[size]} bg-brand-accent`}>
      {children}
    </Link>
  );
}

const textLinkClass =
  "mt-3.5 block min-h-[44px] w-full py-2.5 text-center text-[13px] font-semibold text-secondary-text underline underline-offset-2";

export function TextLink({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & Omit<
  React.ComponentProps<typeof Link>,
  "href" | "className"
>) {
  return (
    <Link href={href} className={textLinkClass} {...props}>
      {children}
    </Link>
  );
}

export function TextLinkButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={textLinkClass} {...props}>
      {children}
    </button>
  );
}
