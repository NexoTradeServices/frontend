// Confirm dialogs -- frontend-conventions.md, Patterns / Confirm dialogs and
// Two dialog severities.
//
// Standard severity (this feature's GST flip): outlined to cancel, filled
// ACCENT to confirm -- flipping is safe by design, not destructive/
// irreversible. Destructive severity swaps the confirm button for filled
// destructive red. Confirmed live on the Ops Portal Shell style reference,
// 01 Sep 2026.
import type { ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  severity = "standard",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  severity?: "standard" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-[420px] rounded-[10px] border border-hairline bg-surface p-5"
      >
        <h4 id="confirm-dialog-title" className="mb-2 font-heading text-[15px] font-extrabold text-ink">
          {title}
        </h4>
        <div className="mb-4 text-[13px] text-secondary-text">{children}</div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2.5 text-sm font-bold text-white ${
              severity === "destructive" ? "bg-brand-destructive" : "bg-brand-accent"
            }`}
          >
            {loading ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
