// Time box -- frontend-conventions.md, Atoms / Form controls (Time box).
// Feature 5001: any minute may be picked, and the time reads "8:07am" on every
// device. The device's own picker follows the device (a 24-hour phone shows no
// am or pm, and Android's clock dialog does not show which one is chosen), so
// this is a box you TYPE the digits into on the number keypad ("807" or
// "8:07"), with two big AM | PM buttons beside it, the chosen one filled.
// Typing 13:05 sets 1:05 PM by itself. Finish may carry a "Now" button.
//
// `value` is 24-hour "HH:mm", or "" until a whole time is in the box.
"use client";

import { useState } from "react";

type Meridiem = "am" | "pm";

/** "8:07", "807", "0807" or "13:05" -> hour (0-23) and minute; null when it is not a time. */
function parseTyped(text: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

function format24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function displayOf(value: string): { text: string; meridiem: Meridiem } | null {
  const parsed = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!parsed) return null;
  const hour = Number(parsed[1]);
  return { text: `${String(hour % 12 === 0 ? 12 : hour % 12)}:${parsed[2] ?? "00"}`, meridiem: hour < 12 ? "am" : "pm" };
}

const buttonBase = "min-h-[44px] min-w-[52px] px-3 text-sm font-bold";

export function TimeBox({
  id,
  label,
  value,
  invalid,
  muted,
  onChange,
  onNow,
}: {
  id: string;
  /** What the box is called for a screen reader, "Start". */
  label: string;
  value: string;
  invalid?: boolean;
  /** The value is a computed default - muted italic until the person sets their own. */
  muted?: boolean;
  onChange: (value: string) => void;
  /** Shows a "Now" button that sets the time to the job's clock right now. */
  onNow?: () => void;
}) {
  // What is being typed, while it is being typed; null shows the saved value.
  const [draft, setDraft] = useState<string | null>(null);
  // AM or PM before any whole time exists; once there is one, the value decides.
  const [pending, setPending] = useState<Meridiem>("am");
  const shown = displayOf(value);
  const meridiem = shown?.meridiem ?? pending;

  function type(text: string) {
    const cleaned = text.replace(/[^\d:]/g, "").slice(0, 5);
    setDraft(cleaned);
    const parsed = parseTyped(cleaned);
    if (parsed === null) {
      if (value !== "") onChange("");
      return;
    }
    // 13:05 and 00:30 are 24-hour on their face; 1 to 12 take the AM | PM choice.
    const hour24 = parsed.hour === 0 || parsed.hour > 12 ? parsed.hour : (parsed.hour % 12) + (meridiem === "pm" ? 12 : 0);
    onChange(format24(hour24, parsed.minute));
  }

  function choose(next: Meridiem) {
    setPending(next);
    if (shown === null) return;
    const [h, m] = value.split(":").map(Number);
    onChange(format24(((h ?? 0) % 12) + (next === "pm" ? 12 : 0), m ?? 0));
  }

  const border = invalid ? "border-brand-destructive" : "border-hairline";
  return (
    <div id={`${id}-group`} role="group" aria-label={label} className="flex items-stretch gap-2">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="8:07"
        value={draft ?? shown?.text ?? ""}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => type(e.target.value)}
        onBlur={() => setDraft(null)}
        className={`min-h-[44px] w-24 min-w-0 rounded-md border bg-surface px-2.5 py-2 text-center text-base text-ink tabular-nums outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 ${border} ${
          muted ? "text-muted-text italic" : ""
        }`}
      />
      <div className={`flex overflow-hidden rounded-md border ${border}`}>
        {(["am", "pm"] as const).map((option) => (
          <button
            key={option}
            id={`${id}-${option}`}
            type="button"
            aria-pressed={meridiem === option}
            aria-label={`${label} ${option === "am" ? "AM" : "PM"}`}
            onClick={() => choose(option)}
            className={`${buttonBase} ${meridiem === option ? "bg-ink text-white" : "bg-surface text-secondary-text"}`}
          >
            {option === "am" ? "AM" : "PM"}
          </button>
        ))}
      </div>
      {onNow ? (
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            onNow();
          }}
          className="min-h-[44px] px-1 text-[13px] font-semibold text-secondary-text underline underline-offset-2"
        >
          Now
        </button>
      ) : null}
    </div>
  );
}
