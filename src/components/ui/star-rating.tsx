"use client";

// The Star rating -- Feature 6009; Molecules / Form controls, Star rating, with Atoms / Star.
//
// Five Stars in brand-accent: read-only (a rating shown) or tap to choose (a rating given). A Star is
// FILLED when it is part of the rating and OUTLINED when it is not, so a chosen 4 reads as four filled
// and one outline. Choosing is five 44px buttons in a radio group; tapping the chosen star again leaves
// the choice as it is (a required answer is changed, never cleared).
const STARS = [1, 2, 3, 4, 5] as const;

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0 text-brand-accent">
      <path
        d="M12 2.8l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 16.99l-5.56 2.93 1.06-6.2L3 9.33l6.22-.9L12 2.8z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A rating shown: whole stars, rounded to the nearest (4.6 shows five). */
export function StarsShown({ value, label }: { value: number; label?: string }) {
  const whole = Math.round(value);
  return (
    <span role="img" aria-label={label ?? `${String(value)} out of 5 stars`} data-testid="stars-shown" data-value={whole} className="inline-flex gap-0.5">
      {STARS.map((n) => (
        <Star key={n} filled={n <= whole} size={20} />
      ))}
    </span>
  );
}

/** A rating given: tap a star to choose. */
export function StarsChoose({
  value,
  onChange,
  label,
}: {
  /** 0 when none is chosen yet. */
  value: number;
  onChange: (value: number) => void;
  /** The group's accessible name. */
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} data-testid="stars-choose" data-value={value} className="flex gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${String(n)} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className="flex size-11 items-center justify-center rounded-button"
        >
          <Star filled={n <= value} size={32} />
        </button>
      ))}
    </div>
  );
}
