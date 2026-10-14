// Page numbers -- frontend-conventions.md, Molecules / Paging a list (Page numbers).
//
// Outlined Previous and Next with the page numbers between them, the current one ink fill and
// on-ink text, centred under the list, with the Caption "Showing 51 to 100 of 1,240" under it.
// 50 rows a page. The page is the caller's: it holds it in the page address with the search and
// filters and passes `hrefFor`, so every number is a real link (back button, share, reload).
// Long lists show the first, the last and the pages around the current one, the gaps as "...".
// On a phone the row stays on one line: < and > for Previous and Next, and the current page with
// two either side of it; the first, the last and the gaps show from tablet width up.
// << and >> jump to the first and the last page at every size.
import Link from "next/link";

/** The numbers to draw: 1, the ones around `page`, and the last, with null for each gap. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, index) => {
    const before = sorted[index - 1];
    if (before !== undefined && n - before > 1) out.push(null);
    out.push(n);
  });
  return out;
}

const outlined =
  "inline-flex min-h-11 min-w-8 items-center justify-center rounded-button border border-hairline bg-surface px-1 text-sm sm:min-w-11 sm:px-3 font-bold text-ink";
const disabled = `${outlined} pointer-events-none opacity-50`;
const current = "inline-flex min-h-11 min-w-8 items-center justify-center rounded-button border border-ink bg-ink px-1 text-sm sm:min-w-11 sm:px-3 font-bold text-on-ink";

export function PageNumbers({
  page,
  pageCount,
  from,
  to,
  total,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  /** The address of page `n`, search and filters kept. */
  hrefFor: (n: number) => string;
}) {
  if (total === 0) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-col items-center gap-2" data-testid="page-numbers">
      {pageCount > 1 ? (
        <ul className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5">
          <li>
            {page > 1 ? (
              <Link href={hrefFor(1)} className={outlined} aria-label="First page">
                <span aria-hidden>&lt;&lt;</span>
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true" aria-label="First page">
                <span aria-hidden>&lt;&lt;</span>
              </span>
            )}
          </li>
          <li>
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} className={outlined} rel="prev" aria-label="Previous page">
                <span aria-hidden className="sm:hidden">&lt;</span>
                <span className="hidden sm:inline">Previous</span>
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true" aria-label="Previous page">
                <span aria-hidden className="sm:hidden">&lt;</span>
                <span className="hidden sm:inline">Previous</span>
              </span>
            )}
          </li>
          {pageWindow(page, pageCount).map((n, index) =>
            n === null ? (
              <li key={`gap-${String(index)}`} aria-hidden className="hidden px-1 text-sm text-muted-text sm:block">
                ...
              </li>
            ) : (
              <li key={n} className={Math.abs(n - page) <= 2 ? undefined : "hidden sm:block"}>
                {n === page ? (
                  <span aria-current="page" className={current}>
                    {n}
                  </span>
                ) : (
                  <Link href={hrefFor(n)} className={outlined} aria-label={`Page ${String(n)}`}>
                    {n}
                  </Link>
                )}
              </li>
            ),
          )}
          <li>
            {page < pageCount ? (
              <Link href={hrefFor(page + 1)} className={outlined} rel="next" aria-label="Next page">
                <span aria-hidden className="sm:hidden">&gt;</span>
                <span className="hidden sm:inline">Next</span>
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true" aria-label="Next page">
                <span aria-hidden className="sm:hidden">&gt;</span>
                <span className="hidden sm:inline">Next</span>
              </span>
            )}
          </li>
          <li>
            {page < pageCount ? (
              <Link href={hrefFor(pageCount)} className={outlined} aria-label="Last page">
                <span aria-hidden>&gt;&gt;</span>
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true" aria-label="Last page">
                <span aria-hidden>&gt;&gt;</span>
              </span>
            )}
          </li>
        </ul>
      ) : null}
      <p className="text-caption text-muted-text tabular-nums" data-testid="page-numbers-caption">
        Showing {from.toLocaleString("en-AU")} to {to.toLocaleString("en-AU")} of {total.toLocaleString("en-AU")}
      </p>
    </nav>
  );
}
