// The Tag -- frontend-conventions.md, Atoms / Tags and chips. Feature 6007.
//
// A small uppercase label in a colour pair: success (Paid), warning (Completed - awaiting payment).
// The job status tags keep their own palette in status-tag.tsx; this is the plain pair for a fact.
import type { ReactNode } from "react";

const PAIRS = {
  success: "bg-success-bg text-brand-success",
  warning: "bg-warning-bg text-brand-warning",
} as const;

export function Tag({ tone, children, testId }: { tone: keyof typeof PAIRS; children: ReactNode; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={`inline-block shrink-0 rounded px-2 py-0.5 text-field-label font-bold tracking-[0.04em] whitespace-nowrap uppercase ${PAIRS[tone]}`}
    >
      {children}
    </span>
  );
}
