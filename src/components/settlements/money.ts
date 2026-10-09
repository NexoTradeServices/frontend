// Money and hours as a settlement shows them -- Feature 6003.
//
// frontend-conventions.md, Organisms / Lists and tables: "$200" for whole dollars, "$200.50"
// otherwise. A contractor's invoice can run past a thousand ("$1,227.50"), so this one adds the
// thousands comma; the shared formatter of the booking flow mirrors the backend's and stays as it is.
export function formatPay(cents: number): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString("en-AU", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** "3.0h" for a whole number of hours, "1.25h" otherwise. */
export function hoursText(hours: number): string {
  return `${Number.isInteger(hours) ? hours.toFixed(1) : String(Number(hours.toFixed(2)))}h`;
}

/** "tel:" link target for a phone number as it is written. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}
