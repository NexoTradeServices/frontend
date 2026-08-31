// Button ladder + button loading -- frontend-conventions.md, Components /
// Buttons and Patterns / Page loading vs button loading.
//
// ONE loud filled button per screen -- accent orange, never two side by side.
// Loading dims the button, spins, and replaces the label; same size,
// disabled while it works.
import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

const primaryBase =
  "mt-1.5 block min-h-[52px] w-full rounded-md px-4 py-3.5 text-center text-sm font-bold text-on-accent";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
}

export function PrimaryButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  className,
  ...buttonProps
}: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`${primaryBase} ${loading ? "bg-brand-accent-loading" : "bg-brand-accent"} ${className ?? ""}`}
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
export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${primaryBase} bg-brand-accent`}>
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
