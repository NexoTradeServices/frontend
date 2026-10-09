// Approve from the contractor's own Payouts page -- Feature 6003, settlement run.
//
// The same act as the email link's Approve (a draft becomes his invoice), done logged in. The
// button shows only while the invoice is a draft; a GST registration not recorded is refused with
// the office-phone Banner right above the button (frontend-conventions.md, Molecules / Messages).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/auth/banner";
import { telHref } from "./money";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export function ApproveHere({ reference }: { reference: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setWorking(true);
    setPhone(null);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/contractor/settlements/${encodeURIComponent(reference)}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await res.json()) as { error?: string; officePhone?: string };
      if (res.ok) {
        router.refresh();
      } else if (res.status === 409 && body.error === "gst_not_recorded") {
        setPhone(body.officePhone ?? "");
      } else if (res.status === 409) {
        router.refresh();
      } else {
        setError("That did not go through - try again.");
      }
    } catch {
      setError("That did not go through - check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      {phone !== null ? (
        <div role="alert" data-testid="gst-banner">
          <Banner kind="error">
            Your GST registration needs recording first. Ring the office on{" "}
            <a href={telHref(phone)} className="font-semibold underline underline-offset-2">
              {phone}
            </a>
            .
          </Banner>
        </div>
      ) : null}
      {error ? <Banner kind="error">{error}</Banner> : null}
      <button
        type="button"
        onClick={() => void approve()}
        disabled={working}
        className="flex min-h-[52px] w-full items-center justify-center rounded-md bg-brand-success px-4 text-sm font-bold text-on-accent disabled:opacity-60 md:min-h-11 md:w-auto md:min-w-40"
      >
        {working ? "Approving..." : "Approve"}
      </button>
    </div>
  );
}
