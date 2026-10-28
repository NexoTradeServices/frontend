// Alert strip -- frontend-conventions.md, Messages to the person / Alert strip:
// a full-width warning-bg band, 12px by 20px padding, centred Small semibold
// brand-warning text, a tappable phone link. The very top of a page, above the
// Page title. Feature 3006 draws it from two places (the open form and the
// closed page), so it lives here once.
import type { ReactNode } from "react";

export function AlertStrip({ children }: { children: ReactNode }) {
  return (
    <div className="bg-warning-bg px-5 py-3 text-center">
      <p className="text-small font-semibold text-brand-warning">{children}</p>
    </div>
  );
}

/** The phone number as the strip shows it: a tappable link. */
export function AlertPhone({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`} className="text-ink underline">
      {phone}
    </a>
  );
}
