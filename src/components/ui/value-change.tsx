// Value change -- frontend-conventions.md, Molecules / Showing values. Feature 6007.
//
// The old value struck through in muted-text, "->", the new value in brand-success, bold.
// The new value may be a link (Feature 3010: the given phone is the one to tap to call).
import type { ReactNode } from "react";

export function ValueChange({ from, to }: { from: string; to: ReactNode }) {
  return (
    <span data-testid="value-change">
      <span className="text-muted-text line-through">{from}</span> <span aria-label="to">-&gt;</span>{" "}
      <b className="font-bold text-brand-success">{to}</b>
    </span>
  );
}
