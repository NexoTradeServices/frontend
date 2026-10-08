// Toast -- frontend-conventions.md, Patterns (distinct from the persistent
// info/alert banner: this one auto-hides). Feature 2001, plan decision 1:
// "Save always returns to the list with a toast." Confirmed on the
// Contractor onboarding flow walkthrough, 03 Sep 2026.
"use client";

import { useEffect, useState } from "react";

const AUTO_HIDE_MS = 4500;

/** Shows `message` for a few seconds, then clears itself. Call `show(text)` again to replace it early. */
export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => setMessage(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return [message, setMessage];
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed right-5 bottom-5 z-50 max-w-[360px] rounded-lg bg-ink px-4 py-3 text-[13px] text-white shadow-lg">
      {message}
    </div>
  );
}

/**
 * Feature 6002: the error Toast (Molecules / Messages to the person - Toast): the same
 * ink box, but it stays until the person closes it.
 */
export function ErrorToast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed right-5 bottom-5 z-50 flex max-w-[360px] items-start gap-3 rounded-lg bg-ink py-3 pr-2 pl-4 text-[13px] text-white shadow-lg"
    >
      <span className="pt-0.5">{message}</span>
      <button type="button" onClick={onClose} aria-label="Close" className="-my-2 flex size-11 shrink-0 items-center justify-center">
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
