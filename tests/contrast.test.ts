// Feature 1018, AC13 -- the colour readability test (folded in from 1016).
//
// Reads every text-on-background pair the conventions' Colours tables name out
// of globals.css and fails on any under 4.5 to 1, bar the parked exceptions:
// each listed with today's ratio, failing only if made fainter.
import { describe, expect, test } from "vitest";
import { colourTokens, readGlobalsCss } from "./helpers/css-tokens";
import { checkPairs, ratioOf, type Exception, type Pair } from "./helpers/contrast";

const STATUSES = ["new", "assigned", "scheduled", "in-progress", "on-hold", "completed", "cancelled"] as const;
const MESSAGE_STATUSES = ["waiting", "sent", "delivered"] as const;

const PAIRS: Pair[] = [
  // Base: text on the page and on cards and fields
  { text: "ink", on: "ground" },
  { text: "ink", on: "surface" },
  { text: "secondary-text", on: "ground" },
  { text: "secondary-text", on: "surface" },
  { text: "muted-text", on: "ground" },
  { text: "muted-text", on: "surface" },
  { text: "muted-text", on: "control-off" },
  // Meaning: text on a fill, and each soft pair
  { text: "on-accent", on: "brand-accent" },
  { text: "on-accent", on: "brand-accent-loading" },
  { text: "on-accent", on: "brand-success" },
  { text: "on-accent", on: "brand-destructive" },
  { text: "brand-success", on: "success-bg" },
  { text: "brand-warning", on: "warning-bg" },
  { text: "brand-destructive", on: "error-bg" },
  // Job status and message status pairs
  ...STATUSES.map((s) => ({ text: `status-${s}`, on: `status-${s}-bg` })),
  ...MESSAGE_STATUSES.map((s) => ({ text: `message-${s}`, on: `message-${s}-bg` })),
  { text: "brand-destructive", on: "error-bg" }, // message Failed reads the error pair
  // On ink
  { text: "on-ink", on: "ink" },
  { text: "on-ink-text", on: "ink" },
  { text: "on-ink-label", on: "ink" },
  // QR code
  { text: "qr-ink", on: "qr-surface" },
];

// Parked while the colours are parked (Tokens / Colours): today's ratios.
const EXCEPTIONS: Exception[] = [
  { text: "muted-text", on: "ground", ratio: 3.69 },
  { text: "muted-text", on: "surface", ratio: 3.88 },
  { text: "muted-text", on: "control-off", ratio: 2.6 },
  { text: "on-accent", on: "brand-accent", ratio: 2.97 },
  { text: "on-accent", on: "brand-accent-loading", ratio: 2.16 },
  { text: "brand-success", on: "success-bg", ratio: 4.49 },
  { text: "brand-warning", on: "warning-bg", ratio: 4.29 },
  { text: "status-scheduled", on: "status-scheduled-bg", ratio: 4.49 },
  { text: "status-in-progress", on: "status-in-progress-bg", ratio: 4.29 },
  { text: "status-on-hold", on: "status-on-hold-bg", ratio: 4.31 },
  { text: "status-completed", on: "status-completed-bg", ratio: 4.21 },
  { text: "status-cancelled", on: "status-cancelled-bg", ratio: 3.32 },
  { text: "message-waiting", on: "message-waiting-bg", ratio: 3.32 },
  { text: "message-delivered", on: "message-delivered-bg", ratio: 4.21 },
];

const tokens = colourTokens(readGlobalsCss());

describe("AC13 -- the colour readability test", () => {
  test("every pair the Colours tables name exists in globals.css", () => {
    for (const pair of PAIRS) {
      expect(tokens.has(pair.text), `${pair.text} is missing`).toBe(true);
      expect(tokens.has(pair.on), `${pair.on} is missing`).toBe(true);
    }
  });

  test("today's palette passes: no unlisted pair under 4.5 to 1, no listed pair fainter than listed", () => {
    expect(checkPairs(tokens, PAIRS, EXCEPTIONS)).toEqual([]);
  });

  test("the exceptions list holds today's ratios, not a looser number", () => {
    for (const exception of EXCEPTIONS) {
      expect(ratioOf(tokens, exception)).toBeGreaterThanOrEqual(exception.ratio);
      // A listed pair that now passes 4.5 comes off the list.
      expect(ratioOf(tokens, exception), `${exception.text} on ${exception.on} passes now: take it off the list`).toBeLessThan(4.5);
    }
  });

  test("a new faint pair fails", () => {
    const faint = new Map(tokens).set("secondary-text", "#b0b0b0");
    const failures = checkPairs(faint, PAIRS, EXCEPTIONS);
    expect(failures.some((f) => f.startsWith("secondary-text on ground"))).toBe(true);
  });

  test("a listed pair made fainter than its listed ratio fails", () => {
    const fainter = new Map(tokens).set("muted-text", "#a0a6ad");
    const failures = checkPairs(fainter, PAIRS, EXCEPTIONS);
    expect(failures.some((f) => f.startsWith("muted-text on ground") && f.includes("fainter than its listed 3.69"))).toBe(true);
  });
});
