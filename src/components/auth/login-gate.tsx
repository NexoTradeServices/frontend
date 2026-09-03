// The gate -- Feature 1003, auth + roles (AC1, AC2).
//
// Confirmed live on the Portal Login Gate style reference, 31 Aug 2026: the
// card title is always the portal's name, and a wrong password and an
// unknown email get the exact same generic banner -- the backend already
// answers both with the same status and message (AC2); this form never adds
// a distinction of its own.
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GateShell, GateCardTitle } from "./gate-shell";
import { Field } from "./field";
import { PrimaryButton, TextLink } from "./buttons";
import { Banner } from "./banner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginGate({
  portalName,
  displayName = null,
}: {
  portalName: string;
  displayName?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  function validateEmail(): boolean {
    if (email !== "" && !EMAIL_PATTERN.test(email)) {
      setEmailError("Enter a full email address.");
      return false;
    }
    setEmailError(undefined);
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    if (!validateEmail() || email === "" || password === "") return;

    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (error) {
      setFormError(
        "That email and password don't match. Check them and try again, or reset your password below.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <GateShell displayName={displayName}>
      <GateCardTitle title={portalName} subtitle="Log in to continue" />
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError ? <Banner kind="error">{formError}</Banner> : null}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={validateEmail}
          error={emailError}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PrimaryButton loading={loading} loadingLabel="Logging in...">
          Log in
        </PrimaryButton>
      </form>
      <TextLink href={`/forgot-password?from=${encodeURIComponent(pathname)}`}>
        Forgot your password?
      </TextLink>
    </GateShell>
  );
}
