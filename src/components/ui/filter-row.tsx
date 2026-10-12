"use client";

// The Filter row -- Feature 9001; Molecules / Finding and filtering, Filter row,
// with Atoms / Tags and chips, Filter pill.
//
// One shared presentational row: the pills (label, count), the chosen one and a
// changed action. No fetching, no address logic -- each page keeps its own
// Search bar, paging and where its state lives.
//
// Phone: one line that scrolls sideways, the last pill cut at the edge (peek),
// an edge fade from ground (left once scrolled), the row bleeding under the side
// space, the chosen pill scrolled into view, no scrollbar, snapping.
// Tablet and up: wraps.
import { useCallback, useEffect, useRef, useState } from "react";

export interface FilterPillSpec {
  key: string;
  label: string;
  count: number;
}

export function FilterRow({
  label,
  pills,
  chosen,
  onChoose,
  className,
}: {
  /** The group's accessible name ("Filter by status"). */
  label: string;
  pills: readonly FilterPillSpec[];
  /** The chosen pill's key, or null when none is (a search is narrowing the list). */
  chosen: string | null;
  onChoose: (key: string) => void;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 4);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // The chosen pill is scrolled into view when the row opens (and when the choice
  // changes by other means); only the row moves, never the page.
  useEffect(() => {
    const el = scroller.current;
    if (el) {
      const pill = el.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (pill) {
        const left = pill.offsetLeft - el.offsetLeft;
        const right = left + pill.offsetWidth;
        if (left < el.scrollLeft) el.scrollLeft = Math.max(0, left - 16);
        else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth + 16;
      }
    }
    measure();
  }, [chosen, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div className={`relative -mx-4 md:mx-0 ${className ?? ""}`}>
      <div
        ref={scroller}
        role="group"
        aria-label={label}
        onScroll={measure}
        className="flex flex-nowrap gap-2 overflow-x-auto scroll-px-4 snap-x snap-mandatory px-4 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {pills.map((pill) => {
          const isChosen = pill.key === chosen;
          return (
            <button
              key={pill.key}
              type="button"
              data-pill={pill.key}
              aria-pressed={isChosen}
              onClick={() => onChoose(pill.key)}
              className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-1 rounded-pill px-3 text-small font-semibold ${
                isChosen
                  ? "bg-ink text-on-ink"
                  : "border border-hairline bg-surface text-secondary-text"
              }`}
            >
              {pill.label}
              <span className="tabular-nums opacity-75">{pill.count}</span>
            </button>
          );
        })}
      </div>
      {fadeLeft ? (
        <span
          aria-hidden="true"
          data-fade="left"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-ground to-transparent md:hidden"
        />
      ) : null}
      {fadeRight ? (
        <span
          aria-hidden="true"
          data-fade="right"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-ground to-transparent md:hidden"
        />
      ) : null}
    </div>
  );
}
