// Dead link -- Feature 1003, auth + roles (AC6, AC7).
//
// Expired or already-used, both land here: one page, the fix as the primary
// action. Confirmed live on the Portal Login Gate style reference.
import { GateShell, GateCardTitle } from "./gate-shell";
import { PrimaryLink, TextLink } from "./buttons";

export function DeadLink({ displayName = null }: { displayName?: string | null }) {
  return (
    <GateShell displayName={displayName}>
      <GateCardTitle
        title="This link has expired"
        subtitle="Reset links work once and expire after an hour"
      />
      <PrimaryLink href="/forgot-password">Email me a fresh link</PrimaryLink>
      <TextLink href="/">Back to log in</TextLink>
    </GateShell>
  );
}
