// The respond page's live part -- Feature 4003, accept / decline.
//
// Contractor Workflow steps 5 and 6: when, where and who to ask for first,
// then the job (her description and answers, the office's Instruction
// notes), and the two answers. Accept (green, filled) and Decline (outlined)
// are fixed at the bottom on a phone and sit right-aligned under the cards
// from md up. Decline opens ONE step - a single optional note, "Anything Mike
// should know?" - and Back returns with nothing sent. After an answer: one
// line and "Go to your jobs". The page carries no money (Contractor messages).
"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/auth/buttons";
import { ReadOnlyPhotoGallery } from "@/components/ui/photo-gallery";
import { DeadLinkCard, GoToJobsLink, cardClass, labelClass } from "./respond-cards";
import type { RespondDead, RespondOpen } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const NOTE_MAX = 500;

type Screen = "job" | "decline" | "accepted" | "declined" | "dead";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="font-semibold text-ink">{children}</div>
    </div>
  );
}

function JobScreen({
  job,
  busy,
  onAccept,
  onDecline,
  error,
}: {
  job: RespondOpen;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  error: string | null;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 pb-28 md:pb-0">
        <div>
          <div className="text-[13px] text-secondary-text">New job for you, {job.contractorFirstName}</div>
          <h1 className="font-heading text-2xl font-extrabold text-ink md:text-[28px]">
            {job.trade} - {job.jobReference}
          </h1>
        </div>

        <section className={`${cardClass} grid gap-3 md:grid-cols-2 md:gap-3.5`}>
          <Fact label="When">
            <span className="font-heading text-lg font-extrabold">{job.slotLabel}</span>
          </Fact>
          <div className="md:order-3 md:col-span-full">
            <Fact label="Where">{job.addressLine}</Fact>
          </div>
          <div className="md:order-2">
            <Fact label="Site contact">{job.contactLine}</Fact>
          </div>
        </section>

        <section className={`${cardClass} flex flex-col gap-3`}>
          <h2 className="font-heading text-base font-extrabold text-ink">The job</h2>
          <div>
            <span className={labelClass}>Customer&apos;s description</span>
            <p className="text-sm whitespace-pre-wrap text-ink">{job.description ?? "No description given."}</p>
          </div>
          {job.answers.length > 0 ? (
            <div>
              <span className={labelClass}>Customer&apos;s answers</span>
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-[18px] text-sm text-ink">
                {job.answers.map((answer) => (
                  <li key={answer}>{answer}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {job.photos.length > 0 ? (
            <div>
              <span className={`${labelClass} mb-1`}>Customer&apos;s photos</span>
              <ReadOnlyPhotoGallery photos={job.photos} />
            </div>
          ) : null}
          {job.instructions.length > 0 ? (
            <div>
              <span className={labelClass}>Instructions from the office</span>
              <div className="mt-1 flex flex-col gap-2">
                {job.instructions.map((note, index) => (
                  <div key={index} className="rounded-lg border border-hairline bg-ground px-3 py-2.5 text-sm text-ink">
                    <span className="whitespace-pre-wrap">{note.note}</span>
                    <div className="mt-1 text-xs text-secondary-text">
                      {note.authorFirstName}, {note.dateLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <p role="alert" className="text-sm text-brand-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {/* Fixed at the bottom on a phone; right-aligned under the cards from md up. */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2.5 border-t border-hairline bg-surface px-4 pt-3 pb-5 md:static md:mt-3.5 md:justify-end md:border-0 md:bg-transparent md:p-0">
        <button
          type="button"
          disabled={busy}
          onClick={onDecline}
          className="min-h-[52px] flex-1 rounded-md border border-[#c9c3b8] bg-surface text-sm font-bold text-ink disabled:opacity-60 md:min-h-11 md:flex-none md:px-[22px]"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="min-h-[52px] flex-[2] rounded-md bg-brand-success text-sm font-bold text-on-accent disabled:opacity-60 md:min-h-11 md:flex-none md:px-7"
        >
          {busy ? "Accepting..." : "Accept"}
        </button>
      </div>
    </>
  );
}

export function RespondView({ token, job }: { token: string; job: RespondOpen }) {
  const [screen, setScreen] = useState<Screen>("job");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState<RespondDead | null>(null);

  async function answer(kind: "accept" | "decline"): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/respond/${encodeURIComponent(token)}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "decline" ? { note } : {}),
      });
      if (res.status === 200) {
        setScreen(kind === "accept" ? "accepted" : "declined");
        return;
      }
      if (res.status === 404 || res.status === 410) {
        // Answered from his other link a moment ago, or expired while he read: say why.
        setDead((await res.json()) as RespondDead);
        setScreen("dead");
        return;
      }
      if (res.status === 400) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "That did not go through. Please try again.");
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "dead" && dead) return <DeadLinkCard dead={dead} />;

  if (screen === "accepted") {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <section className="flex flex-col gap-2 rounded-[10px] border border-success-border bg-success-bg p-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="text-brand-success">
            <path d="M5 12l5 5L20 7" />
          </svg>
          <h1 className="font-heading text-[22px] font-extrabold text-ink">You&apos;re booked</h1>
          <p className="text-sm text-ink">
            {job.jobReference}, {job.slotLabel} at {job.addressLine}. {job.customerFirstName} has been told.
          </p>
        </section>
        <GoToJobsLink />
      </div>
    );
  }

  if (screen === "declined") {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <section className={`${cardClass} flex flex-col gap-2 p-5`}>
          <h1 className="font-heading text-[22px] font-extrabold text-ink">Declined</h1>
          <p className="text-sm text-ink">{job.jobReference} is back with the office. Nothing else to do.</p>
        </section>
        <GoToJobsLink outlined />
      </div>
    );
  }

  if (screen === "decline") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-[13px] text-secondary-text">
            {job.trade} - {job.jobReference}
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Decline this job?</h1>
          <p className="text-sm text-secondary-text">
            {job.slotLabel} - {job.addressLine}
          </p>
        </div>
        <section className={`${cardClass} flex flex-col gap-1.5`}>
          <label htmlFor="decline-note" className="text-sm font-bold text-ink">
            Anything Mike should know?
          </label>
          <textarea
            id="decline-note"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 resize-y rounded-md border border-[#c9c3b8] bg-surface px-3 py-2.5 text-sm text-ink"
          />
        </section>
        {error ? (
          <p role="alert" className="text-sm text-brand-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-2.5">
          <PrimaryButton type="button" size="full" loading={busy} loadingLabel="Declining..." onClick={() => void answer("decline")} className="mt-0">
            Decline the job
          </PrimaryButton>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setScreen("job");
            }}
            className="min-h-[52px] rounded-md border border-[#c9c3b8] bg-surface text-sm font-bold text-ink"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <JobScreen
      job={job}
      busy={busy}
      error={error}
      onAccept={() => void answer("accept")}
      onDecline={() => {
        setError(null);
        setScreen("decline");
      }}
    />
  );
}
