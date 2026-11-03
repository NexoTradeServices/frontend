// Needs attention -- Feature 1020, Molecules / Messages to the person (Needs attention).
//
// A Field label "Needs attention" in brand-warning, then ONE warning Banner row that stays one line
// tall however many items there are: the item's words, its Text button when the reader can act,
// and -- with more than one item -- "1 of 3" between two 44px arrow buttons to go through them.
// Nothing moves by itself. Nothing at all when the list is empty.
"use client";

import { useState } from "react";
import Link from "next/link";

export interface NeedsAttentionItem {
  key: string;
  text: string;
  action: { label: string; href: string } | null;
}

const arrowButton =
  "flex min-h-11 min-w-11 items-center justify-center rounded-button border border-warning-bg bg-surface text-base font-bold text-ink";

export function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  const [shown, setShown] = useState(0);
  if (items.length === 0) return null;
  const index = Math.min(shown, items.length - 1);
  const item = items[index];
  if (item === undefined) return null;
  const many = items.length > 1;
  return (
    <section aria-label="Needs attention" className="mb-4">
      <p className="mb-1.5 text-field-label font-bold tracking-[0.08em] text-brand-warning uppercase">Needs attention</p>
      <div className="flex min-h-11 flex-col justify-center gap-1 rounded-button border border-warning-bg bg-warning-bg px-3 py-2 text-small text-brand-warning sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span aria-live="polite" className="min-w-0 flex-1">
          {item.text}
        </span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {item.action ? (
            <Link
              href={item.action.href}
              className="min-h-11 py-2.5 text-small font-semibold text-secondary-text underline underline-offset-2 sm:whitespace-nowrap"
            >
              {item.action.label}
            </Link>
          ) : null}
          {many ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous item"
                className={arrowButton}
                onClick={() => setShown((index + items.length - 1) % items.length)}
              >
                <span aria-hidden>&#8249;</span>
              </button>
              <span className="min-w-12 text-center tabular-nums">
                {index + 1} of {items.length}
              </span>
              <button
                type="button"
                aria-label="Next item"
                className={arrowButton}
                onClick={() => setShown((index + 1) % items.length)}
              >
                <span aria-hidden>&#8250;</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
