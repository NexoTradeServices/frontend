// The approve page's open state -- Feature 6003, settlement run.
//
// Contractor Settlement / Draft -> approve -> paid: the contractor checks the invoice and taps
// Approve. frontend-conventions.md: Templates / Layouts (Record page in the Focused shell), Atoms
// / Buttons (Success - the Primary that confirms something good), Molecules / Messages to the
// person (a Banner answering one action sits right above that action's button).
//
//   Approve works            -> the "Approved" Message card, the pay day, and where to see it
//   GST not recorded (409)   -> an error Banner above the button; the draft stays open
//   the link died meanwhile  -> the dead-link card for whatever it is now
"use client";

import { useState } from "react";
import { Banner } from "@/components/auth/banner";
import { ApproveUnavailableCard, ApprovedCard, DeadApproveCard } from "./approve-cards";
import { InvoiceCard } from "./invoice-card";
import { telHref } from "./money";
import type { ApproveDead, ApproveOpen } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

type Phase =
  | { kind: "open" }
  | { kind: "approved"; payDay: string }
  | { kind: "dead"; dead: ApproveDead }
  | { kind: "unavailable" };

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a href={telHref(phone)} className="font-semibold underline underline-offset-2">
      {phone}
    </a>
  );
}

export function ApproveView({ token, read }: { token: string; read: ApproveOpen }) {
  const [phase, setPhase] = useState<Phase>({ kind: "open" });
  const [working, setWorking] = useState(false);
  /** the office phone the refusal itself carries, when the draft's GST registration is not recorded */
  const [gstPhone, setGstPhone] = useState<string | null>(null);

  async function approve() {
    setWorking(true);
    setGstPhone(null);
    try {
      const res = await fetch(`${apiUrl}/api/approve/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await res.json()) as { state?: string; payDay?: string; error?: string; officePhone?: string };
      if (res.status === 200) {
        setPhase({ kind: "approved", payDay: body.payDay ?? read.payDay });
      } else if (res.status === 409 && body.error === "gst_not_recorded") {
        setGstPhone(body.officePhone ?? read.officePhone);
      } else if (res.status === 404 || res.status === 410) {
        setPhase({ kind: "dead", dead: body as ApproveDead });
      } else {
        setPhase({ kind: "unavailable" });
      }
    } catch {
      setPhase({ kind: "unavailable" });
    } finally {
      setWorking(false);
    }
  }

  if (phase.kind === "approved") return <ApprovedCard payDay={phase.payDay} />;
  if (phase.kind === "dead") return <DeadApproveCard dead={phase.dead} />;
  if (phase.kind === "unavailable") return <ApproveUnavailableCard />;

  const { invoice } = read;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-black text-ink md:text-[22px]">
          {invoice.heading} {invoice.reference}
        </h1>
        <p className="mt-1 text-[13px] text-secondary-text" data-testid="approve-intro">
          Check it, then approve. If something is wrong, ring the office on <PhoneLink phone={read.officePhone} /> before approving.
        </p>
      </div>

      <InvoiceCard invoice={invoice} />

      <div>
        {gstPhone !== null ? (
          <div role="alert" data-testid="gst-banner">
            <Banner kind="error">
              Your GST registration needs recording first. Ring the office on <PhoneLink phone={gstPhone} />.
            </Banner>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void approve()}
          disabled={working}
          className="flex min-h-[52px] w-full items-center justify-center rounded-md bg-brand-success px-4 text-sm font-bold text-on-accent disabled:opacity-60 md:min-h-11 md:w-auto md:min-w-40"
        >
          {working ? "Approving..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
