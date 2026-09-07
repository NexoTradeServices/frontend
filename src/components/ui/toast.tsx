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
