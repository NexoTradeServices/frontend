// The interim Texts sent page -- Feature 4002, dispatch to assignment, plan
// decision 13. No login (the site is not public yet, owner 12/09/26), in dev
// and production alike, reached by typing the address. Retired by BKLG-028
// once ClickSend is set up.
//
// ONE BLOCK PER STEP OF A JOB: the texts one event sent (the idempotency
// key's front half), newest block on top, alternating a brown and a neutral
// grey tint; each headed by the job reference, the step and when; inside,
// each text with a CONTRACTOR SMS or CUSTOMER SMS badge, to whom with the
// number, and the text exactly as the phone would get it, link working.
import { Fragment } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

interface DevTextRow {
  id: string;
  recipientBadge: string;
  toName: string | null;
  toNumber: string;
  text: string;
  atLabel: string;
}

interface DevTextBlock {
  jobReference: string;
  step: string;
  atLabel: string;
  texts: DevTextRow[];
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  // split() with one capturing group returns the match itself at every odd
  // index -- checking that position, not re-testing the pattern (whose own
  // /g flag carries mutable state across repeated .test() calls).
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} className="underline underline-offset-2" target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export default async function DevTextsPage() {
  const res = await fetch(`${apiUrl}/api/dev/texts`, { cache: "no-store" });
  const body = (res.ok ? await res.json() : { blocks: [] }) as { blocks: DevTextBlock[] };

  return (
    <div className="min-h-screen bg-ground px-4 py-7 md:px-8">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-1 font-heading text-xl font-black text-ink">Texts sent</h1>
        <p className="mb-5 text-[13px] text-muted-text">
          Interim page, no login -- the latest 50 texts sent while there is no live text provider. Retired once ClickSend
          is set up.
        </p>

        {body.blocks.length === 0 ? (
          <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-secondary-text">
            No texts yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {body.blocks.map((block, index) => (
              <section
                key={`${block.jobReference}-${block.step}-${String(index)}`}
                className={`rounded-[10px] border border-hairline p-4 ${index % 2 === 0 ? "bg-[#fdf6ee]" : "bg-secondary"}`}
              >
                <h2 className="mb-3 font-heading text-sm font-extrabold text-ink">
                  {block.jobReference} - {block.step}{" "}
                  <span className="font-body text-xs font-normal text-muted-text">{block.atLabel}</span>
                </h2>
                <div className="flex flex-col gap-3">
                  {block.texts.map((row) => (
                    <div key={row.id} className="rounded-lg border border-hairline bg-surface p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-text">
                        <span className="inline-block rounded bg-secondary px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] text-secondary-text uppercase">
                          {row.recipientBadge}
                        </span>
                        <span>
                          {row.toName ? `${row.toName}, ` : ""}
                          {row.toNumber}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-ink">
                        <Linkified text={row.text} />
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
