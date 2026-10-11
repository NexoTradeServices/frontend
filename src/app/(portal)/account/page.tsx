// Customer portal root -- Feature 1003, auth + roles.
// Architecture & Routing / The doors: `/account`, login required (customer).
// Feature 1018: the login gate and the wrong-portal card are the Portal
// shell's; this page is the logged-in placeholder in the Medium container.
import { Container } from "@/components/frame/container";
import { PortalPlaceholder } from "@/components/auth/portal-placeholder";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (user === null) return null;
  return (
    <Container width="medium">
      <PortalPlaceholder portalName="Customer account" user={user} />
    </Container>
  );
}
