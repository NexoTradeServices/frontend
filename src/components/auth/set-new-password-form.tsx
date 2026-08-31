// Set a new password -- Feature 1003, auth + roles (AC6, AC7, AC12).
//
// One field, no confirm twin -- the reset flow itself is the recovery if it
// is mistyped. Success logs the person straight into their portal, no extra
// "now go log in" stop (Portal Login Gate style reference, 31 Aug 2026).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GateShell, GateCardTitle } from "./gate-shell";
import { Field } from "./field";
import { PrimaryButton } from "./buttons";
import { Banner } from "./banner";
import { PORTAL_ROOTS } from "@/lib/portal-roots";
import type { Role } from "@/lib/session";

const MIN_LENGTH = 8;

export function SetNewPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (password.length < MIN_LENGTH) {
      setError(`At least ${MIN_LENGTH} characters.`);
      return false;
    }
    setError(undefined);
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    if (!validate()) return;

    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    if (resetError) {
      setLoading(false);
      setFormError("That link may have expired. Request a fresh one and try again.");
      return;
    }

    const { data: signInData, error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);
    if (signInError || !signInData) {
      router.push("/");
      return;
    }
    const role = (signInData.user as unknown as { role: Role }).role;
    router.push(PORTAL_ROOTS[role]);
  }

  return (
    <GateShell>
      <GateCardTitle title="Choose a new password" subtitle={`For ${email}`} />
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {formError ? <Banner kind="error">{formError}</Banner> : null}
        <Field
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={validate}
          error={error}
          helper={error ? undefined : `At least ${MIN_LENGTH} characters.`}
        />
        <PrimaryButton loading={loading} loadingLabel="Setting password...">
          Set password
        </PrimaryButton>
      </form>
    </GateShell>
  );
}
