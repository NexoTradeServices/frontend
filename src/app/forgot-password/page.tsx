// Forgot password -- Feature 1003, auth + roles.
// Reached from any of the three gates' "Forgot your password?" link, which
// carries `?from=` so "Back to log in" returns to the door the person left.
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getDisplayName } from "@/lib/identity";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const backTo = from && from.startsWith("/") ? from : "/";
  return <ForgotPasswordForm backTo={backTo} displayName={await getDisplayName()} />;
}
