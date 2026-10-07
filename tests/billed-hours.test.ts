// Feature 5001 -- the live "Billed 3.0h" preview (unit, Vitest).
//
// AC5  the same rule the server stores at Complete: one entry of 58 minutes bills 1.0h;
//      8:07am-11:05am bills 3.0h; a return entry of 20 minutes with the minimum at 30
//      bills 0.5h; the first-visit floor goes to the EARLIEST entry whatever order typed
import { describe, expect, test } from "vitest";
import { billedHoursOf, formatHours } from "../src/lib/billed-hours";
import { centsToDollarsText, dollarsTextToCents, formatClock, formatVisitDate } from "../src/lib/visit-format";

describe("AC5 -- billed hours preview", () => {
  test("a 58-minute first visit bills 1.0h", () => {
    expect(billedHoursOf([{ date: "2026-10-07", start: "08:00", end: "08:58" }], 30)).toBe(1);
  });

  test("8:07am-11:05am bills 3.0h", () => {
    expect(billedHoursOf([{ date: "2026-10-07", start: "08:07", end: "11:05" }], 30)).toBe(3);
  });

  test("a 20-minute return entry with the minimum at 30 adds 0.5h", () => {
    const first = { date: "2026-10-07", start: "08:07", end: "11:05" };
    const back = { date: "2026-10-09", start: "09:00", end: "09:20" };
    expect(billedHoursOf([first, back], 30)).toBe(3.5);
  });

  test("the first-visit floor goes to the earliest entry, whatever order they were typed in", () => {
    const first = { date: "2026-10-07", start: "08:00", end: "08:20" };
    const back = { date: "2026-10-09", start: "09:00", end: "09:20" };
    expect(billedHoursOf([first, back], 30)).toBe(1.5);
    expect(billedHoursOf([back, first], 30)).toBe(1.5);
  });

  test("a half-typed row (no start, finish before start) bills nothing yet", () => {
    expect(billedHoursOf([{ date: "2026-10-07", start: "", end: "09:00" }], 30)).toBe(0);
    expect(billedHoursOf([{ date: "2026-10-07", start: "10:00", end: "09:00" }], 30)).toBe(0);
  });

  test("hours read 3.0, 3.25, 3.5", () => {
    expect([formatHours(3), formatHours(3.25), formatHours(3.5)]).toEqual(["3.0", "3.25", "3.5"]);
  });
});

describe("how a visit reads", () => {
  test("times read 8:07am, 12:00pm, 12:30am; dates read 7 Oct 2026", () => {
    expect([formatClock("08:07"), formatClock("12:00"), formatClock("00:30"), formatClock("13:05")]).toEqual([
      "8:07am",
      "12:00pm",
      "12:30am",
      "1:05pm",
    ]);
    expect(formatVisitDate("2026-10-07")).toBe("7 Oct 2026");
  });

  test("money: whole cents <-> the Money field's text", () => {
    expect(centsToDollarsText(4500)).toBe("45.00");
    expect(dollarsTextToCents("45")).toBe(4500);
    expect(dollarsTextToCents("$45.50")).toBe(4550);
    expect(dollarsTextToCents("0")).toBeNull();
    expect(dollarsTextToCents("4.505")).toBeNull();
    expect(dollarsTextToCents("abc")).toBeNull();
  });
});
