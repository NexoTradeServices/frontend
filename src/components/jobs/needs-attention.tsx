// Needs attention -- Feature 1020, Molecules / Messages to the person (Needs attention).
//
// A Field label "Needs attention" in brand-warning, then one warning Banner row per item, 6px
// apart, 44px at least: the words on the left and, when the reader can act, a Text button on the
// right; on a phone the button drops under the words. Nothing at all when the list is empty.
import Link from "next/link";

export interface NeedsAttentionItem {
  key: string;
  text: string;
  action: { label: string; href: string } | null;
}

export function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs attention" className="mb-4">
      <p className="mb-1.5 text-field-label font-bold tracking-[0.08em] text-brand-warning uppercase">Needs attention</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex min-h-11 flex-col justify-center gap-0.5 rounded-button border border-warning-bg bg-warning-bg px-3 py-2 text-small text-brand-warning sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span>{item.text}</span>
            {item.action ? (
              <Link
                href={item.action.href}
                className="min-h-11 py-2.5 text-small font-semibold text-secondary-text underline underline-offset-2 sm:whitespace-nowrap"
              >
                {item.action.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
