// The dashboard's Availability messages -- Feature 2004, Molecules / Messages to the person (Banner).
//
// "Set your availability" until the first save (it blocks nothing), and the one-time notice when the business widened its
// opening hours: the new half hours start as Not available until he switches them on. Each is a warning Banner with an
// Outlined button; the notice's button says it has been seen and goes to Availability.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/auth/banner";
import { timeLabelFor } from "@/components/ui/calendar-day-view";
import { minutesOfClock } from "@/components/availability/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const outlined =
  "inline-flex min-h-11 items-center rounded-button border border-hairline bg-surface px-4 py-2 text-sm font-bold text-ink";

export function AvailabilityBanners({
  setAvailability,
  hoursNotice,
}: {
  setAvailability: boolean;
  hoursNotice: { openingTime: string; closingTime: string } | null;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  async function seen() {
    try {
      await fetch(`${apiUrl}/api/contractor/hours-notice-seen`, { method: "POST", credentials: "include" });
    } catch {
      // the notice just shows again next time
    }
    setDismissed(true);
    router.push("/contractor/availability");
  }

  return (
    <>
      {hoursNotice !== null && !dismissed ? (
        <Banner kind="warning">
          <p className="mb-2" data-testid="hours-notice">
            Opening hours are now {timeLabelFor(minutesOfClock(hoursNotice.openingTime))} to {timeLabelFor(minutesOfClock(hoursNotice.closingTime))}. The new
            times start as Not available until you switch them on.
          </p>
          <button type="button" className={outlined} onClick={() => void seen()}>
            Check availability
          </button>
        </Banner>
      ) : null}
      {setAvailability ? (
        <Banner kind="warning">
          <p className="mb-2">Set your availability so the office knows when you can work. Until you do, every time inside opening hours counts as available.</p>
          <Link href="/contractor/availability" className={outlined}>
            Set your availability
          </Link>
        </Banner>
      ) : null}
    </>
  );
}
