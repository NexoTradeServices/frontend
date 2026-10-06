// The Contractor agreement card on Settings -- Feature 2006.
//
// Managing the contractor record / Contract acceptance: the owner publishes
// the agreement as a PDF with a label of their own; every version is a new,
// never-changed file and the latest is the current one. Publishing is its
// own action, not part of the page's Save: it opens a dialog that says how
// many active contractors it will stop, and only then goes ahead. The past
// versions are listed under it, newest first.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field } from "@/components/auth/field";
import { Banner } from "@/components/auth/banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { openSignedFile, shortDate } from "@/lib/agreement-files";
import type { AgreementListDto, AgreementVersionDto } from "@/components/agreement/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const TIMEZONE = "Australia/Perth";
const NAME_MAX = 36;

const textButton = "min-h-11 py-2.5 text-[13px] font-semibold text-secondary-text underline underline-offset-2";

function shortName(name: string): string {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 3)}...` : name;
}

function CurrentTag() {
  return (
    <span className="inline-block rounded bg-success-bg px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap text-brand-success uppercase">
      Current
    </span>
  );
}

async function readList(): Promise<AgreementListDto | null> {
  try {
    const res = await fetch(`${apiUrl}/api/agreements`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as AgreementListDto;
  } catch {
    return null;
  }
}

export function AgreementCard({ timezone = TIMEZONE }: { timezone?: string }) {
  const [list, setList] = useState<AgreementListDto | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<{ file?: string; version?: string }>({});
  const [legalBanner, setLegalBanner] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [openError, setOpenError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await readList();
    setList(result);
    setLoadFailed(result === null);
  }, []);

  useEffect(() => {
    let live = true;
    void readList().then((result) => {
      if (!live) return;
      setList(result);
      setLoadFailed(result === null);
    });
    return () => {
      live = false;
    };
  }, []);

  function askToPublish() {
    const next: { file?: string; version?: string } = {};
    if (!file) next.file = "Required.";
    if (label.trim() === "") next.version = "Required.";
    setErrors(next);
    setLegalBanner(undefined);
    setSuccess(undefined);
    if (next.file || next.version) return;
    setConfirmOpen(true);
  }

  async function publish() {
    if (!file) return;
    setPublishing(true);
    try {
      const res = await fetch(`${apiUrl}/api/agreements?label=${encodeURIComponent(label.trim())}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
        const message = body.error ?? "Couldn't publish - try again shortly.";
        if (body.field === "legalIdentity") setLegalBanner(message);
        else if (body.field === "version") setErrors({ version: message });
        else setErrors({ file: message });
        return;
      }
      setSuccess(`Version ${label.trim()} published.`);
      setFile(null);
      setLabel("");
      setErrors({});
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch {
      setErrors({ file: "Couldn't publish - check your connection and try again." });
    } finally {
      setPublishing(false);
      setConfirmOpen(false);
    }
  }

  async function openVersion(version: AgreementVersionDto) {
    const failed = await openSignedFile(`/api/agreements/${version.id}/file`);
    setOpenError(failed ?? undefined);
  }

  const versions = list?.versions ?? [];

  return (
    <div className="mb-4.5 max-w-[720px] rounded-[10px] border border-hairline bg-surface p-4 sm:p-5">
      <h3 className="font-heading text-base font-extrabold text-ink">Contractor agreement</h3>
      <p className="mb-3.5 text-xs text-muted-text">All fields are required</p>
      {legalBanner ? <Banner kind="error">{legalBanner}</Banner> : null}
      {success ? <Banner kind="success">{success}</Banner> : null}

      <div className="mb-3.5">
        <label
          htmlFor="agreementFile"
          className="mb-[5px] block text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase"
        >
          Agreement file
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="min-h-[52px] w-full rounded-md border border-hairline bg-surface px-4 py-3.5 text-sm font-bold text-ink sm:min-h-11 sm:w-auto sm:py-2.5"
          >
            Choose file
          </button>
          <span className={`min-w-0 text-sm ${file ? "text-ink" : "text-muted-text"}`}>
            {file ? shortName(file.name) : "No file chosen"}
          </span>
        </div>
        <input
          ref={fileInput}
          id="agreementFile"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setErrors((current) => ({ ...current, file: undefined }));
          }}
        />
        {errors.file ? <p className="mt-1 text-xs text-brand-destructive">{errors.file}</p> : null}
      </div>

      <div className="max-w-[240px]">
        <Field
          id="agreementVersion"
          label="Version label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErrors((current) => ({ ...current, version: undefined }));
          }}
          error={errors.version}
          maxLength={40}
        />
      </div>

      <button
        type="button"
        onClick={askToPublish}
        className="min-h-[52px] w-full rounded-md border border-hairline bg-surface px-4 py-3.5 text-sm font-bold text-ink sm:min-h-11 sm:w-auto sm:py-2.5"
      >
        Publish version
      </button>

      <hr className="mt-3.5 mb-3 border-0 border-t border-hairline" />

      {loadFailed ? (
        <p className="text-[13px] text-brand-destructive">Couldn&apos;t load the versions - try again shortly.</p>
      ) : list === null ? (
        <div aria-hidden="true" className="h-10 rounded-md bg-ground" />
      ) : versions.length === 0 ? (
        <p className="text-[13px] text-muted-text">No agreement published yet.</p>
      ) : (
        <>
          <table className="hidden w-full border-collapse sm:table">
            <thead>
              <tr>
                {["Version", "Issued", "By", ""].map((heading) => (
                  <th
                    key={heading || "open"}
                    className="border-b border-hairline px-3 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] text-muted-text uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} className="border-b border-hairline last:border-b-0">
                  <td className="px-3 py-2.5 text-sm font-semibold text-ink">
                    <span className="mr-2">{version.version}</span>
                    {version.current ? <CurrentTag /> : null}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-ink">{shortDate(version.issuedAt, timezone)}</td>
                  <td className="px-3 py-2.5 text-sm text-ink">{version.issuedBy}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button type="button" className={textButton} onClick={() => void openVersion(version)}>
                      Open PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 sm:hidden">
            {versions.map((version) => (
              <li key={version.id} className="rounded-[10px] border border-hairline bg-surface p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <b className="font-heading text-ink">Version {version.version}</b>
                  {version.current ? <CurrentTag /> : null}
                </div>
                <p className="mt-1 text-[13px] text-muted-text">
                  Issued {shortDate(version.issuedAt, timezone)} by {version.issuedBy}
                </p>
                <button type="button" className={textButton} onClick={() => void openVersion(version)}>
                  Open PDF
                </button>
              </li>
            ))}
          </ul>
          {openError ? <p className="mt-2 text-xs text-brand-destructive">{openError}</p> : null}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Publish version ${label.trim()}?`}
        confirmLabel="Publish"
        loading={publishing}
        loadingLabel="Publishing..."
        onConfirm={() => void publish()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>
          Every active contractor ({list?.activeContractors ?? 0}) must accept it before new jobs can be sent to
          them. Jobs already booked go ahead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
