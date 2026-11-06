// The dashboard's one Needs attention block -- Feature 2003's readiness panel, joined by 2004's Availability messages.
//
// The server decides what is missing (key, copy, pen, route, blocking), the screen renders. One block, one row per item,
// 6px apart, nothing sliding: the new opening hours notice, Set your availability, then each readiness item. Two shapes
// for a readiness item, picked by whose pen it is (Managing the contractor record / "What the contractor sees on his
// dashboard"): his own read as an instruction, linked when its page exists; the office's state the fact and send him to
// the office, never a link. The block is gone when nothing is left (the pattern is Components / Needs attention).
"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReadinessItemDto } from "./types";
import { HoursNoticeRow, SetAvailabilityRow, attentionRow, textButton } from "./availability-banners";

function ReadinessRow({ item }: { item: ReadinessItemDto }) {
  return (
    <li className={attentionRow}>
      <span className="font-semibold">{item.copy}</span>
      {item.pen === "own" && item.route ? (
        <Link href={item.route} className={textButton}>
          Fix now
        </Link>
      ) : null}
      {item.pen === "mikes" ? <span className="shrink-0 text-small font-semibold text-muted-text">Call the office</span> : null}
    </li>
  );
}

export function NeedsAttention({
  ready,
  missing,
  setAvailability,
  hoursNotice,
}: {
  ready: boolean;
  missing: ReadinessItemDto[];
  setAvailability: boolean;
  hoursNotice: { openingTime: string; closingTime: string } | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  const showHours = hoursNotice !== null && !dismissed;
  // Renders only while something needs attention -- blocking or not.
  if (!showHours && !setAvailability && missing.length === 0) return null;

  return (
    <section className="mb-4" aria-label="Needs attention" data-testid="needs-attention">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-field-label font-bold tracking-[0.08em] text-brand-warning uppercase">Needs attention</span>
        {/* The tag only when something blocks dispatch -- a contractor missing only his own address never sees it. */}
        {!ready ? (
          <span className="inline-block rounded bg-warning-bg px-2 py-0.5 text-field-label font-bold tracking-[0.04em] text-brand-warning uppercase">
            Not ready to dispatch
          </span>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {showHours && hoursNotice !== null ? <HoursNoticeRow hoursNotice={hoursNotice} onSeen={() => setDismissed(true)} /> : null}
        {setAvailability ? <SetAvailabilityRow /> : null}
        {missing.map((item) => (
          <ReadinessRow key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}
