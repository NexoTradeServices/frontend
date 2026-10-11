// Settings screen -- Feature 1006, admin settings screen.
// Architecture & Routing / Page inventory: `/ops/settings`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { AgreementCard } from "@/components/settings/agreement-card";
import { SettingsForm, type SettingsDto } from "@/components/settings/settings-form";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { OwnerOnly } from "@/components/auth/owner-only";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function OpsSettingsPage() {
  const user = await getSessionUser();
  // Settings is the owner's: an ops login is in its own portal, so the frame
  // stays and the page says so with one Owner only card (Feature 1018).
  if (user?.role !== "owner") return <OwnerOnly user={user} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/settings`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <LoadFailed />;
  const settings = (await res.json()) as SettingsDto;

  return (
    <Container width="medium">
      <PageHeader
        title="Settings"
        subtitle="Business-wide configuration. Changes apply from the moment you save."
      />
      <SettingsForm initial={settings} />
      <AgreementCard timezone={settings.timezone} />
    </Container>
  );
}
