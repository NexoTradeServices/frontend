// Locked/frozen field state -- frontend-conventions.md, Components /
// Locked/frozen field state.
//
// Visually distinct from a plain disabled field: muted Ground background, a
// small lock icon, helper text explaining why it is frozen. Feature 1007's
// normal service-level multiplier (plan decision 1: the base rates ARE the
// normal price -- an editable normal multiplier would quietly break "the
// price shown is the price billed").
export function LockedField({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="mb-3.5">
      <label className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">
        {label}
      </label>
      <div className="flex min-h-[44px] items-center gap-2 rounded-md border border-hairline bg-ground px-2.5 py-2 text-sm text-ink">
        <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0 text-muted-text" fill="none">
          <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
        </svg>
        {value}
      </div>
      <p className="mt-[5px] text-xs text-muted-text">{helper}</p>
    </div>
  );
}
