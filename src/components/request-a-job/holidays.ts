// Public holidays for the two job forms -- Feature 1020, Calendar & Scheduling / Public holidays.
//
// Once the suburb gives the state, the form reads that state's holidays once (the open endpoint, no
// login). A date Field cannot grey out days, so a holiday shows as the Field's error at once - the
// default of today included - and stops Next / Save. The server refuses it too.
"use client";

import { useEffect, useState } from "react";
import type { PickedAddress, PlatformSuburb } from "@/components/ui/places-field";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const STATE_PATTERN = /\b(WA|NSW|VIC|QLD|SA|TAS|ACT|NT)\b/;

/** The state of whatever the suburb box holds: a Places pick carries it; a platform suburb's label reads "Hilton WA 6163". */
export function stateOfPick(location: PickedAddress | null, platformSuburb: PlatformSuburb | null): string | null {
  if (location !== null && location.state) return location.state;
  if (platformSuburb !== null) return STATE_PATTERN.exec(platformSuburb.label)?.[1] ?? null;
  return null;
}

/** The words under the date Field for a holiday, or undefined. */
export function holidayWords(name: string): string {
  return `We're closed on ${name}. Please pick another date.`;
}

/** date (YYYY-MM-DD) -> holiday name, for `state`; empty until the state is known or the read fails (the server still refuses). */
export function usePublicHolidays(state: string | null): Record<string, string> {
  const [loaded, setLoaded] = useState<{ state: string; byDate: Record<string, string> } | null>(null);
  useEffect(() => {
    if (state === null) return;
    const controller = new AbortController();
    fetch(`${apiUrl}/api/public-holidays?state=${state}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ holidays: { date: string; name: string }[] }>) : null))
      .then((body) => {
        if (body === null) return;
        setLoaded({ state, byDate: Object.fromEntries(body.holidays.map((h) => [h.date, h.name])) });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [state]);
  return state !== null && loaded?.state === state ? loaded.byDate : {};
}

/**
 * Today's date in the suburb's state (Feature 1022): at 10pm in Perth a Sydney suburb is already tomorrow, so the date
 * default and the earliest date come from the server by state, never from the device. Null until the state is known.
 */
export function useStateToday(state: string | null): string | null {
  const [loaded, setLoaded] = useState<{ state: string; date: string } | null>(null);
  useEffect(() => {
    if (state === null) return;
    const controller = new AbortController();
    fetch(`${apiUrl}/api/enquiries/today?state=${state}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ date: string }>) : null))
      .then((body) => {
        if (body !== null) setLoaded({ state, date: body.date });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [state]);
  return state !== null && loaded?.state === state ? loaded.date : null;
}
