// Feature 1018, AC12 -- globals.css holds every token under the conventions' names,
// shadcn's names point at tokens, there is no .dark block, and no colour value
// sits outside the token block.
import { describe, expect, test } from "vitest";
import { blocksOf, colourTokens, readGlobalsCss } from "./helpers/css-tokens";

const css = readGlobalsCss();
// :root appears three times: the colour tokens, then sizes / corners / shadcn names, then the Tablet-and-up sizes.
const rootBlocks = blocksOf(css, ":root");
const root = new Map([...(rootBlocks[1] ?? [])]);
const colours = colourTokens(css);

// frontend-conventions / Tokens / Colours
const COLOUR_NAMES = [
  "ground", "surface", "hairline", "ink", "secondary-text", "muted-text", "control-off",
  "brand-accent", "brand-accent-loading", "brand-success", "success-bg", "brand-warning", "warning-bg",
  "brand-destructive", "error-bg", "on-accent",
  "status-new", "status-new-bg", "status-assigned", "status-assigned-bg", "status-scheduled", "status-scheduled-bg",
  "status-in-progress", "status-in-progress-bg", "status-on-hold", "status-on-hold-bg",
  "status-completed", "status-completed-bg", "status-cancelled", "status-cancelled-bg",
  "message-waiting", "message-waiting-bg", "message-sent", "message-sent-bg", "message-delivered", "message-delivered-bg",
  "on-ink", "on-ink-text", "on-ink-label", "qr-ink", "qr-surface",
];

// frontend-conventions / Tokens / Fonts and Spacing, corners, heights
const SIZE_NAMES = ["page-title", "card-title", "body", "small", "caption", "amount", "name", "field-label", "hero-headline", "lead"];
const CORNER_NAMES = ["card", "small-box", "button", "tag", "pill"];

const SHADCN_COLOURS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary",
  "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent",
  "accent-foreground", "destructive", "border", "input", "ring",
];

describe("AC12 -- the tokens", () => {
  test("every colour token the conventions name is defined, as a hex", () => {
    for (const name of COLOUR_NAMES) expect(colours.has(name), `--${name}`).toBe(true);
  });

  test("the new ones are there: control-off, on-ink, on-ink-text, on-ink-label", () => {
    expect(colours.get("control-off")).toBe("#cfd4da");
    expect(colours.get("on-ink")).toBe("#ffffff");
    expect(colours.get("on-ink-text")).toBe("#b9c2cc");
    expect(colours.get("on-ink-label")).toBe("#dfe4e9");
  });

  test("every text size is a token, including Name (15px), Hero headline (28px, 40px from Tablet) and Lead (18px)", () => {
    for (const name of SIZE_NAMES) expect(root.has(`--text-${name}-size`), `--text-${name}-size`).toBe(true);
    expect(root.get("--text-name-size")).toBe("15px");
    expect(root.get("--text-hero-headline-size")).toBe("28px");
    expect(root.get("--text-lead-size")).toBe("18px");
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{\s*:root\s*\{[^}]*--text-hero-headline-size:\s*40px/);
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{\s*:root\s*\{[^}]*--text-page-title-size:\s*22px/);
    expect(root.get("--text-page-title-size")).toBe("20px");
  });

  test("every corner is a token, including the 8px small-box corner", () => {
    for (const name of CORNER_NAMES) expect(root.has(`--corner-${name}`), `--corner-${name}`).toBe(true);
    expect(root.get("--corner-small-box")).toBe("8px");
    expect(root.get("--corner-card")).toBe("10px");
    expect(root.get("--corner-button")).toBe("6px");
    expect(root.get("--corner-tag")).toBe("4px");
  });
});

describe("AC12 -- shadcn's names", () => {
  test("every shadcn colour name points at one of our tokens", () => {
    const tokenNames = new Set([...colours.keys()]);
    for (const name of SHADCN_COLOURS) {
      const value = root.get(`--${name}`);
      expect(value, `--${name}`).toBeDefined();
      const target = /^var\(--([a-z0-9-]+)\)$/.exec(value ?? "");
      expect(target, `--${name} is ${value ?? "missing"}, not a var() of a token`).not.toBeNull();
      expect(tokenNames.has(target?.[1] ?? ""), `--${name} -> --${target?.[1] ?? "?"}`).toBe(true);
    }
  });

  test("the mapping the conventions give: primary is brand-accent, ring is brand-accent, secondary is ground", () => {
    expect(root.get("--primary")).toBe("var(--brand-accent)");
    expect(root.get("--primary-foreground")).toBe("var(--on-accent)");
    expect(root.get("--ring")).toBe("var(--brand-accent)");
    expect(root.get("--secondary")).toBe("var(--ground)");
    expect(root.get("--destructive")).toBe("var(--brand-destructive)");
    expect(root.get("--border")).toBe("var(--hairline)");
  });
});

describe("AC12 -- nothing outside the token block", () => {
  test("there is no .dark block", () => {
    expect(css).not.toMatch(/(^|\s)\.dark\s*\{/);
  });

  test("no sidebar-* or chart-* leftovers", () => {
    expect(css).not.toMatch(/--sidebar|--chart/);
  });

  test("no colour value appears outside the token block", () => {
    const start = css.indexOf(":root {");
    const open = css.indexOf("{", start);
    const close = css.indexOf("\n}", open);
    const outside = css.slice(0, start) + css.slice(close);
    const withoutComments = outside.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments.match(/#[0-9a-fA-F]{3,8}\b|\boklch\(|\brgba?\(|\bhsla?\(/g)).toBeNull();
  });
});
