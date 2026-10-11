// Feature 1018, AC10 -- the Public shell, server-rendered to markup (no new library).
//
// No page uses the Public shell yet, so this is how it is proven: the Top bar
// (the Wordmark and "Request a job"), the Footer with the business name, the
// operator phone as a tap-to-call link and only the links to pages that are
// built; and, with the identity read failed, the shell still draws, without
// name or phone.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PublicShell } from "@/components/frame/public-shell";

function render(displayName: string | null, phone: string | null): string {
  // PublicShell is a plain function component: call it, then render the element it returns.
  return renderToStaticMarkup(
    PublicShell({ displayName, phone, children: createElement("p", null, "The page content") }),
  );
}

describe("AC10 -- the Public shell", () => {
  test("draws the Top bar with the Wordmark and one Request a job button", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    expect(html).toContain("<header");
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).toContain("Perth Trades");
    expect(header).toContain('href="/request-a-job"');
    expect(header).toContain("Request a job");
  });

  test("draws the Footer with the business name and the phone as a tap-to-call link", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    expect(footer).toContain("Perth Trades");
    expect(footer).toContain('href="tel:0800000000"');
    expect(footer).toContain("08 0000 0000");
  });

  test("the Footer links only to built pages: Request a job and nothing else", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    const hrefs = [...footer.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.filter((href) => !href?.startsWith("tel:"))).toEqual(["/request-a-job"]);
    for (const dead of ["Services", "About", "Contact", "Privacy", "Terms"]) {
      expect(footer).not.toContain(`>${dead}<`);
    }
  });

  test("the phone and the Request a job link are at least 44px to tap (AC15)", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    for (const anchor of footer.match(/<a [^>]*>/g) ?? []) expect(anchor).toContain("min-h-11");
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).toContain("min-h-11");
  });

  test("never shows the legal name or the ABN: the Footer reads the business name only", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    expect(html).not.toMatch(/ABN/i);
  });

  test("the page content sits between the Top bar and the Footer", () => {
    const html = render("Perth Trades & Services", "08 0000 0000");
    expect(html.indexOf("</header>")).toBeLessThan(html.indexOf("The page content"));
    expect(html.indexOf("The page content")).toBeLessThan(html.indexOf("<footer"));
  });

  test("with the identity read failed, it draws without a name or a phone", () => {
    const html = render(null, null);
    expect(html).toContain("<header");
    expect(html).toContain("<footer");
    expect(html).toContain("The page content");
    expect(html).not.toContain("tel:");
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    expect(footer).toContain('href="/request-a-job"');
  });
});
