// The stripped chrome -- Feature 1003, auth + roles.
//
// Patterns / Layout shells: "The login gate ... uses the same stripped
// chrome: navy top bar with the wordmark, warm ground, one centered white
// card, one primary action, no nav." Confirmed live on the Portal Login Gate
// style reference, 31 Aug 2026 -- every value here is copied from it, not
// re-decided.
import type { ReactNode } from "react";

export function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <div className="bg-ink px-4 py-3 font-heading text-xs font-black tracking-[0.14em] text-white uppercase">
        Perth Trades <span className="text-brand-accent">&amp;</span> Services
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-9">
        <div className="w-full max-w-[360px] rounded-[10px] border border-hairline bg-surface p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function GateCardTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="mb-0.5 font-heading text-base font-extrabold text-ink">{title}</h1>
      <p className="mb-[18px] text-xs text-muted-text">{subtitle}</p>
    </>
  );
}
