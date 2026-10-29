// /set-password -- Feature 3004, guest to account upgrade.
// Page map: Focused shell, Narrow, a Message page with a Field in its card (same row as Forgot
// password). Every offer for a login opens it; no login needed.
import { Container } from "@/components/frame/container";
import { SetPasswordRequestForm } from "@/components/auth/set-password-request-form";

export const metadata = { title: "Set a password" };

export default function SetPasswordPage() {
  return (
    <Container width="narrow">
      <SetPasswordRequestForm />
    </Container>
  );
}
