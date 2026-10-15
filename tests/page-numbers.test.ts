// Feature 6006 -- the Page numbers control (unit, Vitest): the window of numbers and what it renders.
//
// The look at 390px and the live jumps are proven in the browser on the control's dev preview page
// (e2e/refunds.spec.ts, which that page's production 404 keeps out of CI); the rules are proven here.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PageNumbers, pageWindow } from "@/components/ui/page-numbers";

describe("pageWindow", () => {
  test("a short list shows every page", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
  test("a long list shows the first, the last and the pages around the current one, with gaps", () => {
    expect(pageWindow(6, 25)).toEqual([1, null, 5, 6, 7, null, 25]);
    expect(pageWindow(1, 25)).toEqual([1, 2, null, 25]);
    expect(pageWindow(25, 25)).toEqual([1, null, 24, 25]);
  });
  test("pages next to the ends leave no gap", () => {
    expect(pageWindow(2, 25)).toEqual([1, 2, 3, null, 25]);
  });
});

describe("PageNumbers", () => {
  const hrefFor = (n: number) => `/ops/refunds?page=${String(n)}`;

  test("shows the caption, the jumps, the current page and links to the others", () => {
    const html = renderToStaticMarkup(createElement(PageNumbers, { page: 2, pageCount: 3, from: 51, to: 100, total: 120, hrefFor }));
    expect(html).toContain("Showing 51 to 100 of 120");
    expect(html).toContain('aria-label="First page"');
    expect(html).toContain('aria-label="Last page"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/ops/refunds?page=1"');
    expect(html).toContain('href="/ops/refunds?page=3"');
  });

  test("on the first page the backwards controls are not links", () => {
    const html = renderToStaticMarkup(createElement(PageNumbers, { page: 1, pageCount: 3, from: 1, to: 50, total: 120, hrefFor }));
    expect(html).toContain('aria-disabled="true" aria-label="First page"');
    expect(html).toContain('aria-disabled="true" aria-label="Previous page"');
    expect(html).not.toContain('aria-disabled="true" aria-label="Next page"');
  });

  test("one page of rows shows only the caption; no rows shows nothing", () => {
    const one = renderToStaticMarkup(createElement(PageNumbers, { page: 1, pageCount: 1, from: 1, to: 7, total: 7, hrefFor }));
    expect(one).toContain("Showing 1 to 7 of 7");
    expect(one).not.toContain("First page");
    expect(renderToStaticMarkup(createElement(PageNumbers, { page: 1, pageCount: 1, from: 0, to: 0, total: 0, hrefFor }))).toBe("");
  });
});
