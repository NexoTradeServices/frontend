// Set a password (the request) -- Feature 3004, guest to account.
//
// Every offer ("Want to track all your jobs? Set a password") opens this page. She types her email
// and taps "Email me a link"; the page runs the enquiry form's reCAPTCHA check and then always says
// the same thing, so it never reveals which emails we hold. The email arrives filled when she comes
// from the confirmation page (kept in the browser, never in the address bar).
"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { MessageCard } from "@/components/ui/message-card";
import { GateCard, GateCardTitle } from "./gate-shell";
import { Field } from "./field";
import { PrimaryButton } from "./buttons";
import { Banner } from "./banner";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const STORAGE_KEY = "enquiryEmail";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readStoredEmail(): string {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const noSubscription = () => () => undefined;

export function SetPasswordRequestForm() {
  const stored = useSyncExternalStore(noSubscription, readStoredEmail, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? stored;
  const [emailError, setEmailError] = useState<string>();
  const [botPhone, setBotPhone] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBotPhone(undefined);
    setFailed(false);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Enter your email address.");
      return;
    }
    setEmailError(undefined);
    setLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken("set_password");
      const res = await fetch(`${apiUrl}/api/account/set-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), recaptchaToken }),
      });
      if (res.status === 403) {
        const body = (await res.json().catch(() => ({}))) as { operatorPhone?: string };
        setBotPhone(body.operatorPhone ?? "");
      } else if (res.status === 400) {
        setEmailError("Enter your email address.");
      } else if (res.ok) {
        setSent(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <MessageCard
        title="Check your inbox"
        success
        link={
          <Link href="/" className="mt-1 text-small font-semibold text-secondary-text underline underline-offset-2">
            Back to the home page
          </Link>
        }
      >
        <p>If we have jobs under that address, we&apos;ve sent you a link to set your password.</p>
      </MessageCard>
    );
  }

  return (
    <GateCard>
      <GateCardTitle title="Track your jobs online" subtitle="We'll email you a link to set a password" />
      {botPhone !== undefined ? (
        <Banner kind="error">
          We couldn&apos;t take that request automatically - please call us on{" "}
          {botPhone === "" ? "the office number" : <a href={`tel:${botPhone.replace(/\s+/g, "")}`} className="underline">{botPhone}</a>}.
        </Banner>
      ) : null}
      {failed ? <Banner kind="error">That didn&apos;t send. Please try again in a moment.</Banner> : null}
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setTyped(event.target.value)}
          error={emailError}
        />
        <PrimaryButton loading={loading} loadingLabel="Sending...">
          Email me a link
        </PrimaryButton>
      </form>
    </GateCard>
  );
}
