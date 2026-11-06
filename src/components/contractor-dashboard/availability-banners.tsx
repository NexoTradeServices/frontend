// The dashboard's Availability rows -- Feature 2004, shown inside the one Needs attention block (readiness-panel.tsx).
//
// "Set your availability" until the first save (it blocks nothing), and the one-time notice when the business widened its
// opening hours: the new half hours start as Not available until he switches them on. Each is a warning row with a Text
// button on the right; the notice's button says it has been seen and goes to Availability.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { timeLabelFor } from "@/components/ui/calendar-day-view";
import { minutesOfClock } from "@/components/availability/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

/** One warning row of the Needs attention block: the words on the left, the way forward on the right (under them on a phone). */
export const attentionRow =
  "flex min-h-11 flex-col gap-1.5 rounded-button border border-brand-warning/50 bg-warning-bg px-3 py-2.5 text-small text-brand-warning sm:flex-row sm:items-center sm:justify-between sm:gap-3";
export const textButton = "shrink-0 self-start text-small font-bold text-brand-accent hover:underline sm:self-auto";

export function HoursNoticeRow({ hoursNotice, onSeen }: { hoursNotice: { openingTime: string; closingTime: string }; onSeen: () => void }) {
  const router = useRouter();

  async function seen() {
    try {
      await fetch(`${apiUrl}/api/contractor/hours-notice-seen`, { method: "POST", credentials: "include" });
    } catch {
      // the notice just shows again next time
    }
    onSeen();
    router.push("/contractor/availability");
  }

  return (
    <li className={attentionRow}>
      <span data-testid="hours-notice">
        Opening hours are now {timeLabelFor(minutesOfClock(hoursNotice.openingTime))} to {timeLabelFor(minutesOfClock(hoursNotice.closingTime))}. The new
        times start as Not available until you switch them on.
      </span>
      <button type="button" className={textButton} onClick={() => void seen()}>
        Check availability
      </button>
    </li>
  );
}

export function SetAvailabilityRow() {
  return (
    <li className={attentionRow}>
      <span>Set your availability so the office knows when you can work. Until you do, every time inside opening hours counts as available.</span>
      <Link href="/contractor/availability" className={textButton}>
        Set your availability
      </Link>
    </li>
  );
}
