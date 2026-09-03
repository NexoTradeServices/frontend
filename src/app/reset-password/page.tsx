// Reset password -- Feature 1003, auth + roles (AC6, AC7).
//
// The link the email sends goes to Better Auth's own backend redirect first
// (GET /api/auth/reset-password/:token), which validates the token
// non-destructively and forwards the browser here with either `?token=` or
// `?error=`. A `token` is re-checked against the same read-only lookup
// (GET /api/reset-link) to get the email for the card's "For <email>" line --
// the same Verification row, read twice, never consumed by either read.
import { DeadLink } from "@/components/auth/dead-link";
import { SetNewPasswordForm } from "@/components/auth/set-new-password-form";
import { getDisplayName } from "@/lib/identity";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error || !token) {
    return <DeadLink displayName={await getDisplayName()} />;
  }

  const [res, displayName] = await Promise.all([
    fetch(`${apiUrl}/api/reset-link?token=${encodeURIComponent(token)}`, { cache: "no-store" }),
    getDisplayName(),
  ]);
  if (res.status !== 200) {
    return <DeadLink displayName={displayName} />;
  }
  const { email } = (await res.json()) as { email: string };

  return <SetNewPasswordForm email={email} token={token} displayName={displayName} />;
}
