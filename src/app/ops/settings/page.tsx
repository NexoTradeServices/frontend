// Settings screen -- Feature 1006, admin settings screen.
// Architecture & Routing / Page inventory: `/ops/settings`, owner only.
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDisplayName } from "@/lib/identity";
import { LoginGate } from "@/components/auth/login-gate";
import { WrongDoor } from "@/components/auth/wrong-door";
import { OpsShell } from "@/components/ops-shell/ops-shell";
import { SettingsForm, type SettingsDto } from "@/components/settings/settings-form";

const PORTAL_NAME = "Operations portal";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default async function OpsSettingsPage() {
  const [user, displayName] = await Promise.all([getSessionUser(), getDisplayName()]);
  if (!user) return <LoginGate portalName={PORTAL_NAME} displayName={displayName} />;
  // Ops has no access to the pricing pen, not even read (plan decision 3) --
  // the wrong-door card is the same one 1003 built for a portal that is not
  // yours at all; here it is a page inside your own portal that isn't.
  if (user.role !== "owner") return <WrongDoor user={user} portalName="Settings" displayName={displayName} />;

  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/settings`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (res.status !== 200) return <WrongDoor user={user} portalName="Settings" displayName={displayName} />;
  const settings = (await res.json()) as SettingsDto;

  return (
    <OpsShell
      user={user}
      active="settings"
      title="Settings"
      subtitle="Business-wide configuration. Changes apply from the moment you save."
      displayName={displayName}
    >
      <SettingsForm initial={settings} />
    </OpsShell>
  );
}
