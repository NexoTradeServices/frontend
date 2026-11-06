// Form dialog -- a Dialog (frontend-conventions.md, Organisms / Dialogs and bars) that holds a short form rather than a
// yes/no question. Feature 5002: Bob's "Book a return visit". On a phone it fills the screen (a header with the title and
// a close X, the form scrolling, the two buttons fixed at the foot); from tablet up it is a Card up to 640px wide centred
// over the page dimmed with ink at 40%. Escape, Cancel, the X and a tap on the dimmed page all close it without doing
// anything; focus moves in and back (Radix Dialog underneath).
"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

export function FormDialog({
  open,
  title,
  confirmLabel,
  confirmDisabled = false,
  busy = false,
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  children,
  testId,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  busy?: boolean;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : busy ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 duration-150 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          data-testid={testId}
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-surface outline-none md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[90vh] md:w-full md:max-w-[640px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:border md:border-hairline"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 md:px-5">
            <Dialog.Title className="font-heading text-base font-extrabold text-ink">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              disabled={busy}
              className="flex size-11 items-center justify-center rounded-button text-secondary-text disabled:opacity-50"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2 md:px-5">{children}</div>
          <div className="flex gap-2.5 border-t border-hairline bg-surface px-4 py-3 pb-5 md:justify-end md:px-5 md:pb-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-[52px] flex-1 rounded-button border border-hairline bg-surface px-4 text-sm font-bold text-ink disabled:opacity-50 md:min-h-11 md:flex-none"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled || busy}
              className={`min-h-[52px] flex-[2] rounded-button px-4 text-sm font-bold md:min-h-11 md:flex-none ${
                confirmDisabled ? "bg-hairline text-muted-text" : "bg-brand-accent text-on-accent"
              } disabled:cursor-not-allowed`}
            >
              {busy ? "Saving..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
