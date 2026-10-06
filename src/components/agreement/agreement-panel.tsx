// Bob's agreement page body -- Feature 2006, contractor agreement acceptance.
//
// Managing the contractor record / Contract acceptance: he reads the PDF in
// his own time, ticks, and accepts. Three states, all from the server's own
// read: nothing published, not yet accepted, accepted. Designed phone first.
// Never a gate -- the page is reached from the dashboard's readiness row and
// the update email, and sits in no menu.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/auth/banner";
import { PrimaryLink } from "@/components/auth/buttons";
import { friendlyDate, openSignedFile } from "@/lib/agreement-files";
import type { OwnAgreementDto } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const DEFAULT_ZONE = "Australia/Perth";

const outlinedButton =
  "min-h-[52px] w-full rounded-md border border-hairline bg-surface px-4 py-3.5 text-sm font-bold text-ink sm:min-h-11 sm:w-auto sm:py-2.5";
const textButton = "min-h-11 py-2.5 text-[13px] font-semibold text-secondary-text underline underline-offset-2";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 max-w-[520px] rounded-[10px] border border-hairline bg-surface p-4 sm:p-5">
      <h3 className="mb-3.5 font-heading text-base font-extrabold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function TickCircle() {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success-bg text-brand-success"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

async function readOwnAgreement(): Promise<OwnAgreementDto | null> {
  try {
    const res = await fetch(`${apiUrl}/api/contractor/agreement`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as OwnAgreementDto;
  } catch {
    return null;
  }
}

export function AgreementPanel() {
  const [agreement, setAgreement] = useState<OwnAgreementDto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    const result = await readOwnAgreement();
    setAgreement(result);
    setLoadError(result === null);
  }, []);

  useEffect(() => {
    let live = true;
    void readOwnAgreement().then((result) => {
      if (!live) return;
      setAgreement(result);
      setLoadError(result === null);
    });
    return () => {
      live = false;
    };
  }, []);

  async function openAgreement() {
    if (!agreement?.version) return;
    const failed = await openSignedFile(`/api/agreements/${agreement.version.id}/file`);
    setError(failed ?? undefined);
  }

  async function openRecord() {
    if (!agreement) return;
    const failed = await openSignedFile(`/api/agreements/records/${agreement.contractorCode}`);
    setError(failed ?? undefined);
  }

  async function accept() {
    if (!agreement?.version || !ticked || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`${apiUrl}/api/contractor/agreement/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: agreement.version.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't save your acceptance - try again shortly.");
        // A stale page (a newer version came out meanwhile) shows the real current state.
        if (res.status === 409) await load();
        return;
      }
      setTicked(false);
      await load();
    } catch {
      setError("Couldn't save your acceptance - check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <>
        <Banner kind="error">Couldn&apos;t load the agreement - try again shortly.</Banner>
      </>
    );
  }
  if (agreement === null) {
    return (
      <>
        <div aria-hidden="true" className="h-40 max-w-[520px] rounded-[10px] bg-ground" />
      </>
    );
  }

  if (!agreement.published || agreement.version === null) {
    return (
      <>
        <div className="mx-auto mt-4 w-full max-w-[420px] rounded-[10px] border border-hairline bg-surface p-5 text-center">
          <h3 className="mb-2 font-heading text-xl font-black text-ink">Contractor agreement</h3>
          <p className="mb-4 text-sm text-secondary-text">No agreement to accept yet.</p>
          <PrimaryLink href="/contractor">Back to dashboard</PrimaryLink>
        </div>
      </>
    );
  }

  const zone = agreement.timezone ?? DEFAULT_ZONE;
  const label = agreement.version.label;

  if (agreement.accepted && agreement.acceptedAt) {
    return (
      <>
        <Card title={`Version ${label}`}>
          <div className="mb-3.5 flex items-center gap-3">
            <TickCircle />
            <div>
              <b className="block text-sm font-semibold text-ink">Accepted, version {label}</b>
              <span className="text-[13px] text-muted-text">on {friendlyDate(agreement.acceptedAt, zone)}</span>
            </div>
          </div>
          <button type="button" className={outlinedButton} onClick={() => void openAgreement()}>
            Read the agreement (PDF)
          </button>
          <div className="mt-1">
            <button type="button" className={textButton} onClick={() => void openRecord()}>
              Your acceptance record (PDF)
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-brand-destructive">{error}</p> : null}
        </Card>
      </>
    );
  }

  return (
    <>
      <Banner kind="warning">
        Until you accept version {label}, no new jobs can be sent to you. Jobs already booked go ahead.
      </Banner>
      <Card title={`Version ${label}`}>
        <div className="mb-3.5">
          <span className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase">Issued</span>
          <span className="text-sm text-ink">{friendlyDate(agreement.version.issuedAt, zone)}</span>
        </div>
        <button type="button" className={outlinedButton} onClick={() => void openAgreement()}>
          Read the agreement (PDF)
        </button>
        <hr className="mt-3.5 mb-3 border-0 border-t border-hairline" />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--brand-accent)]"
            checked={ticked}
            onChange={(e) => setTicked(e.target.checked)}
          />
          <span className="text-sm text-ink">I have read and accept version {label}</span>
        </label>
        <button
          type="button"
          disabled={!ticked || busy}
          onClick={() => void accept()}
          className={`mt-3 min-h-[52px] w-full rounded-md px-4 py-3.5 text-sm font-bold sm:min-h-11 sm:w-auto sm:py-2.5 ${
            !ticked ? "border border-hairline bg-ground text-muted-text" : busy ? "bg-brand-success/70 text-on-accent" : "bg-brand-success text-on-accent"
          }`}
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-1.5">
              <span aria-hidden className="inline-block size-3 animate-spin rounded-full border-2 border-white/45 border-t-white" />
              Accepting...
            </span>
          ) : (
            "Accept"
          )}
        </button>
        {error ? <p className="mt-2 text-xs text-brand-destructive">{error}</p> : null}
      </Card>
    </>
  );
}
