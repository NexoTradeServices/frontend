// Time box -- frontend-conventions.md, Atoms / Form controls (Time box).
// Feature 5001: any minute may be picked, and the time reads "8:07am" on every
// device. The device's own time picker takes its format from the device (a
// 24-hour phone shows no am or pm), so this is three plain dropdowns - hour,
// minute, am/pm - that open the device's own wheel on a phone.
//
// `value` is 24-hour "HH:mm", or "" until the hour and minute are both chosen.
"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function partsOf(value: string): { hour: string; minute: string; meridiem: "am" | "pm" } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return { hour: "", minute: "", meridiem: "am" };
  const h = Number(match[1]);
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: match[2] ?? "00", meridiem: h < 12 ? "am" : "pm" };
}

function valueOf(hour: string, minute: string, meridiem: "am" | "pm"): string {
  if (hour === "" || minute === "") return "";
  const h = (Number(hour) % 12) + (meridiem === "pm" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const selectClass =
  "min-h-[44px] min-w-0 flex-1 rounded-md border bg-surface px-1.5 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10";

export function TimeBox({
  id,
  label,
  value,
  invalid,
  muted,
  onChange,
}: {
  id: string;
  /** What the three dropdowns are called for a screen reader, "Start". */
  label: string;
  value: string;
  invalid?: boolean;
  /** The value is a computed default - muted italic until the person picks their own. */
  muted?: boolean;
  onChange: (value: string) => void;
}) {
  // Half-picked (an hour, no minute yet) lives here; a complete value comes from outside and wins.
  const [partial, setPartial] = useState(() => partsOf(value));
  const parts = value !== "" ? partsOf(value) : partial;

  function change(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    setPartial(merged);
    onChange(valueOf(merged.hour, merged.minute, merged.meridiem));
  }

  const border = invalid ? "border-brand-destructive" : "border-hairline";
  const tone = muted ? "text-muted-text italic" : "";
  return (
    <div id={id} role="group" aria-label={label} className="flex gap-1.5">
      <select
        id={`${id}-hour`}
        aria-label={`${label} hour`}
        value={parts.hour}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => change({ hour: e.target.value })}
        className={`${selectClass} ${border} ${tone}`}
      >
        <option value="">-</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        id={`${id}-minute`}
        aria-label={`${label} minute`}
        value={parts.minute}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => change({ minute: e.target.value })}
        className={`${selectClass} ${border} ${tone}`}
      >
        <option value="">--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        id={`${id}-meridiem`}
        aria-label={`${label} am or pm`}
        value={parts.meridiem}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => change({ meridiem: e.target.value as "am" | "pm" })}
        className={`${selectClass} ${border} ${tone}`}
      >
        <option value="am">am</option>
        <option value="pm">pm</option>
      </select>
    </div>
  );
}
