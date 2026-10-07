// Time box -- frontend-conventions.md, Atoms / Form controls (Time box).
// Feature 5001: any minute may be picked, and the time reads "8:07am" on every
// device. The device's own picker follows the device (a 24-hour phone shows no
// am or pm, and Android's clock dialog does not show which one is chosen), so
// this is ONE box with two tappable parts inside it, `hh : mm` - tap the hour
// and type it, tap the minute and type it - with two big AM | PM buttons beside
// it, the chosen one filled. Typing an hour of 13 or more sets PM by itself.
// Finish may carry a "Now" button.
//
// `value` is 24-hour "HH:mm", or "" until a whole time is in the box.
"use client";

import { useRef, useState } from "react";

type Meridiem = "am" | "pm";

function format24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function partsOf(value: string): { hour: string; minute: string; meridiem: Meridiem } | null {
  const parsed = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!parsed) return null;
  const hour = Number(parsed[1]);
  return { hour: String(hour % 12 === 0 ? 12 : hour % 12), minute: parsed[2] ?? "00", meridiem: hour < 12 ? "am" : "pm" };
}

const digitsOnly = (text: string): string => text.replace(/\D/g, "").slice(0, 2);

const partClass =
  "w-9 min-w-0 bg-transparent py-2 text-center text-base text-ink tabular-nums outline-none placeholder:text-muted-text";

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
  // Each part holds what is being typed; null shows the saved value.
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);
  // AM or PM before any whole time exists; once there is one, the value decides.
  const [pending, setPending] = useState<Meridiem>("am");
  const minuteRef = useRef<HTMLInputElement>(null);
  const shown = partsOf(value);
  const meridiem = shown?.meridiem ?? pending;
  const hourText = hourDraft ?? shown?.hour ?? "";
  const minuteText = minuteDraft ?? shown?.minute ?? "";

  /** A whole time exists only when the hour is 0-23 and the minute is two digits, 00-59. */
  function commit(hourTyped: string, minuteTyped: string, side: Meridiem) {
    const hour = Number(hourTyped);
    if (hourTyped === "" || hour > 23 || minuteTyped.length !== 2 || Number(minuteTyped) > 59) {
      if (value !== "") onChange("");
      return;
    }
    // 13 to 23 and 0 are 24-hour on their face; 1 to 12 take the AM | PM choice.
    const hour24 = hour === 0 || hour > 12 ? hour : (hour % 12) + (side === "pm" ? 12 : 0);
    onChange(format24(hour24, Number(minuteTyped)));
  }

  function typeHour(text: string) {
    const typed = digitsOnly(text);
    setHourDraft(typed);
    const hour = Number(typed);
    const side: Meridiem = typed !== "" && hour > 12 ? "pm" : typed !== "" && hour === 0 ? "am" : meridiem;
    if (side !== meridiem) setPending(side);
    commit(typed, minuteText, side);
    // An hour that cannot take another digit moves on to the minute.
    if (typed.length === 2 || (typed.length === 1 && hour >= 2)) minuteRef.current?.focus();
  }

  function typeMinute(text: string) {
    const typed = digitsOnly(text);
    setMinuteDraft(typed);
    commit(hourText, typed, meridiem);
  }

  function choose(next: Meridiem) {
    setPending(next);
    if (shown === null) return;
    const [h, m] = value.split(":").map(Number);
    onChange(format24(((h ?? 0) % 12) + (next === "pm" ? 12 : 0), m ?? 0));
  }

  /** Leaving a part tidies a whole time ("7" -> "07"); a half-typed one is kept as it is. */
  function settle() {
    if (value !== "") {
      setHourDraft(null);
      setMinuteDraft(null);
    } else if (minuteDraft !== null && minuteDraft.length === 1) {
      const padded = `0${minuteDraft}`;
      setMinuteDraft(padded);
      commit(hourText, padded, meridiem);
    }
  }

  const border = invalid ? "border-brand-destructive" : "border-hairline";
  const tone = muted ? "text-muted-text italic" : "";
  return (
    <div id={`${id}-group`} role="group" aria-label={label} className="flex items-stretch gap-2">
      <div
        className={`flex min-h-[44px] items-center justify-center rounded-md border bg-surface px-2 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 ${border}`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="hh"
          aria-label={`${label} hour`}
          aria-invalid={invalid ? true : undefined}
          value={hourText}
          onChange={(e) => typeHour(e.target.value)}
          onBlur={settle}
          className={`${partClass} ${tone}`}
        />
        <span aria-hidden className="text-base text-muted-text">
          :
        </span>
        <input
          id={`${id}-minute`}
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="mm"
          aria-label={`${label} minute`}
          aria-invalid={invalid ? true : undefined}
          value={minuteText}
          onChange={(e) => typeMinute(e.target.value)}
          onBlur={settle}
          className={`${partClass} ${tone}`}
        />
      </div>
      <div className={`flex overflow-hidden rounded-md border ${border}`}>
        {(["am", "pm"] as const).map((option) => (
          <button
            key={option}
            id={`${id}-${option}`}
            type="button"
            aria-pressed={meridiem === option}
            aria-label={`${label} ${option === "am" ? "AM" : "PM"}`}
            onClick={() => choose(option)}
            className={`min-h-[44px] min-w-[52px] px-3 text-sm font-bold ${
              meridiem === option ? "bg-ink text-white" : "bg-surface text-secondary-text"
            }`}
          >
            {option === "am" ? "AM" : "PM"}
          </button>
        ))}
      </div>
      {onNow ? (
        <button
          type="button"
          onClick={() => {
            setHourDraft(null);
            setMinuteDraft(null);
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
