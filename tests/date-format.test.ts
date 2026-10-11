// Feature 9001 -- the screens' date writer (frontend-conventions / Organisms / Lists
// and tables / Formats), the same words as the backend's.
//   AC1: "9 Sep 2026" -- month names fixed, September is "Sep", never "Sept", never numbers
//   AC2: "Wed 14 Oct" this year, "Wed 14 Oct 2025" in any other
//   AC3: "9 Sep 2026, 10:14am"
import { describe, expect, test } from "vitest";
import { formatDate, formatDateTime, formatDateWithDay, weekdayName } from "../src/lib/date-format";

const NOW = new Date("2026-10-11T02:00:00.000Z"); // 10:00am Sun 11 Oct, Perth

describe("AC1 -- a date written out", () => {
  test("every month is its own three letters; September is Sep", () => {
    const months = Array.from({ length: 12 }, (_, index) => formatDate(`2026-${String(index + 1).padStart(2, "0")}-09`));
    expect(months).toEqual([
      "9 Jan 2026",
      "9 Feb 2026",
      "9 Mar 2026",
      "9 Apr 2026",
      "9 May 2026",
      "9 Jun 2026",
      "9 Jul 2026",
      "9 Aug 2026",
      "9 Sep 2026",
      "9 Oct 2026",
      "9 Nov 2026",
      "9 Dec 2026",
    ]);
  });

  test("a moment is read in the zone given, never the viewer's", () => {
    expect(formatDate("2026-09-09T16:00:00.000Z", "Australia/Perth")).toBe("10 Sep 2026");
    expect(formatDate("2026-09-09T16:00:00.000Z", "UTC")).toBe("9 Sep 2026");
  });

  test("what it cannot read comes back as given", () => {
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("AC2 -- a date with its weekday", () => {
  test("this year carries no year; any other year carries it", () => {
    expect(formatDateWithDay("2026-10-14", undefined, NOW)).toBe("Wed 14 Oct");
    expect(formatDateWithDay("2025-10-14", undefined, NOW)).toBe("Tue 14 Oct 2025");
    expect(formatDateWithDay("2027-01-05", undefined, NOW)).toBe("Tue 5 Jan 2027");
  });

  test("the year boundary is the zone's own midnight", () => {
    const moment = "2026-12-31T16:30:00.000Z";
    const decemberNow = new Date("2026-12-20T02:00:00.000Z");
    expect(formatDateWithDay(moment, "Australia/Perth", decemberNow)).toBe("Fri 1 Jan 2027");
    expect(formatDateWithDay(moment, "UTC", decemberNow)).toBe("Thu 31 Dec");
  });

  test("a day alone stays its name", () => {
    expect(weekdayName("2026-10-12")).toBe("Monday");
  });
});

describe("AC3 -- a date with a time", () => {
  test("the date and the time, am or pm", () => {
    expect(formatDateTime("2026-09-09T02:14:00.000Z", "Australia/Perth")).toBe("9 Sep 2026, 10:14am");
    expect(formatDateTime("2026-09-09T06:05:00.000Z", "Australia/Perth")).toBe("9 Sep 2026, 2:05pm");
    expect(formatDateTime("2026-09-09T16:00:00.000Z", "Australia/Perth")).toBe("10 Sep 2026, 12:00am");
  });
});
