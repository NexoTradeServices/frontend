// Forgot password -- Feature 1003, auth + roles (AC5, AC12).
//
// The sent state reads the same whether or not the email has an account
// (no-enumeration); Better Auth's own /api/auth/request-password-reset
// already answers both cases identically (AC5's own test proves it), so this
// form has no branching of its own to get that wrong.
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GateShell, GateCardTitle } from "./gate-shell";
import { Field } from "./field";
import { PrimaryButton, TextLink } from "./buttons";
import { Banner } from "./banner";

export function ForgotPasswordForm({ backTo }: { backTo: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (email === "") return;
    setLoading(true);
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <GateShell>
      <GateCardTitle title="Reset your password" subtitle="We'll email you a link to set a new one" />
      {sent ? (
        <Banner kind="success">
          If that email has an account, the reset link is on its way. It expires in one hour.
        </Banner>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)}>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PrimaryButton loading={loading} loadingLabel="Sending...">
            Email me a reset link
          </PrimaryButton>
        </form>
      )}
      <TextLink href={backTo}>Back to log in</TextLink>
    </GateShell>
  );
}
