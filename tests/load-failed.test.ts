// Feature 9001, AC6 -- "This page didn't load" carries its one Primary, "Try again" (unit, Vitest).
//
// Pages / Whole-page rules: the card says "This page didn't load", "Try again in a moment.",
// and has one Primary "Try again" that loads the page again; the shell around it stays. The
// card is drawn on the server when a read fails, so this renders it as the server would.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { LoadFailed } from "../src/components/ui/load-failed";

describe("AC6 -- the page that didn't load", () => {
  test("the Message card in the Narrow container, with its title, its line and a Try again button", () => {
    const html = renderToStaticMarkup(createElement(LoadFailed));
    expect(html).toContain('data-container="narrow"');
    expect(html).toContain('data-testid="message-card"');
    expect(html).toContain("This page didn&#x27;t load");
    expect(html).toContain("Try again in a moment.");
    expect(html).toMatch(/<button[^>]*>Try again<\/button>/);
    // One Primary only.
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain("bg-brand-accent");
  });
});
