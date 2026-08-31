// Error / success banner -- frontend-conventions.md, Patterns / Error banners.
export function Banner({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "border-error-border bg-error-bg text-brand-destructive"
      : "border-success-border bg-success-bg text-brand-success";
  return <div className={`mb-4 rounded-md border px-3 py-2.5 text-[13px] ${styles}`}>{children}</div>;
}
