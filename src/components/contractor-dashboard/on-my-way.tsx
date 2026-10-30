// The "On my way" control -- Feature 5004. One optional tap on the dashboard card and on the job
// screen's Arrival card: sends the customer (and the site contact) one message per booked visit.
// Outlined button; once sent, its place shows the sent line instead. The page that holds it owns
// the state (`value`), so both buttons of one screen always agree.
"use client";

import { useState } from "react";
import type { OnMyWayDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export const ON_MY_WAY_FAILED = "Couldn't send On my way - try again.";

/** Posts the tap; the answer is the job view, whose `onMyWay` is the new state. Null when it failed. */
export async function postOnMyWay(reference: string): Promise<OnMyWayDto | undefined> {
  try {
    const res = await fetch(`${apiUrl}/api/contractor/jobs/${encodeURIComponent(reference)}/on-my-way`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return undefined;
    return ((await res.json()) as { onMyWay: OnMyWayDto }).onMyWay;
  } catch {
    return undefined;
  }
}

export function OnMyWayButton({ busy, onTap }: { busy: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      data-testid="on-my-way-button"
      onClick={onTap}
      disabled={busy}
      className="min-h-[52px] w-full rounded-button border border-hairline bg-surface px-[18px] text-sm font-bold text-ink disabled:opacity-50 md:min-h-11 md:w-auto"
    >
      On my way
    </button>
  );
}

export function OnMyWaySent({ sentLabel }: { sentLabel: string }) {
  return (
    <p data-testid="on-my-way-sent" className="text-caption font-bold text-brand-success">
      On my way sent at {sentLabel}
    </p>
  );
}

/** The dashboard card's own control: the button or the sent line, with its error Banner right above. */
export function CardOnMyWay({ reference, initial }: { reference: string; initial: NonNullable<OnMyWayDto> }) {
  const [value, setValue] = useState<NonNullable<OnMyWayDto>>(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function tap() {
    setFailed(false);
    setBusy(true);
    const next = await postOnMyWay(reference);
    setBusy(false);
    if (next === undefined || next === null) {
      setFailed(true);
      return;
    }
    setValue(next);
  }

  return (
    <>
      {failed ? (
        <p role="alert" className="mb-2.5 rounded-button border border-error-border bg-error-bg px-3 py-2.5 text-small text-brand-destructive">
          {ON_MY_WAY_FAILED}
        </p>
      ) : null}
      {value.sent ? <OnMyWaySent sentLabel={value.sentLabel} /> : <OnMyWayButton busy={busy} onTap={() => void tap()} />}
    </>
  );
}
