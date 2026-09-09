// The dashboard's readiness panel -- Feature 2003, plan decision 2: the
// server decides (key, copy, pen, route, blocking), the screen renders. Two
// row shapes only, picked by whose pen the field is (Managing the
// contractor record / "What the contractor sees on his dashboard"): his own
// read as an instruction, linked when its page exists; Mike's state the
// fact and send him to the office, never a link.
import Link from "next/link";
import type { ReadinessItemDto } from "./types";

function ReadinessRow({ item }: { item: ReadinessItemDto }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-hairline px-3.5 py-2.5">
      <span className="text-sm font-semibold text-ink">{item.copy}</span>
      {item.pen === "own" && item.route ? (
        <Link href={item.route} className="shrink-0 text-[13px] font-bold text-brand-accent hover:underline">
          Fix now
        </Link>
      ) : null}
      {item.pen === "mikes" ? (
        <span className="shrink-0 text-[13px] font-semibold text-muted-text">Call the office</span>
      ) : null}
    </li>
  );
}

export function ReadinessPanel({ ready, missing }: { ready: boolean; missing: ReadinessItemDto[] }) {
  // AC6: renders only while something is missing -- blocking or not.
  if (missing.length === 0) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-[10px] border border-hairline">
      {/* AC8: the tag sits over the panel only when something actually blocks
          dispatch -- a contractor missing only his own address (non-blocking)
          never sees it. */}
      {!ready ? (
        <div className="bg-warning-bg px-3.5 py-2.5">
          <span className="inline-block rounded bg-surface px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] text-brand-warning uppercase">
            Not ready to dispatch
          </span>
        </div>
      ) : null}
      <ul className="m-0 list-none bg-surface p-0">
        {missing.map((item) => (
          <ReadinessRow key={item.key} item={item} />
        ))}
      </ul>
    </div>
  );
}
