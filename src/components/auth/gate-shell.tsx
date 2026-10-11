// The gate's card -- Feature 1003, auth + roles; frame removed by Feature 1018.
//
// The login, password, wrong-portal and dead-link pages are each one card.
// What used to be here as a frame (the ink header and the 360px centring) is
// now the Focused shell and the Narrow container; only the card is left, as
// the Card organism: surface, 1px hairline, 10px corners, 16px padding on
// Phone and 20px from Tablet. Its inside is 9001's to restyle.
import type { ReactNode } from "react";

export function GateCard({ children }: { children: ReactNode }) {
  return <div className="w-full rounded-card border border-hairline bg-surface p-4 md:p-5">{children}</div>;
}

export function GateCardTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="mb-0.5 font-heading text-page-title font-extrabold text-ink">{title}</h1>
      <p className="mb-[18px] text-caption text-muted-text">{subtitle}</p>
    </>
  );
}
